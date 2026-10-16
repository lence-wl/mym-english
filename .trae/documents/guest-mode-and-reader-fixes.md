# 游客模式（不登录可读）+ 阅读页两项修复

## Context

用户要求：移动端与桌面端都要支持「**不登录也能做基本阅读**，但**不能调用相关能力**」（取词/查句/翻译/TTS/收藏/云同步进度）。

已确认的决策：
- **可读范围**：仅 `isPublic=true` 且正常上架的公开书。
- **游客入口**：未登录访问**直接进公开书架**（不再强制跳登录页），选书即可阅读。
- **游客进度**：存 localStorage，**登录后合并**到账号；合并规则 = **仅当服务端该书无进度时才上传本地**，服务端已有则保留服务端（不覆盖）。
- **能力表现**：入口保留，**划词即弹「登录后可用」**并跳登录页。
- **游客书架**：右上角/顶部提供**显式「登录」按钮**引导。
- **私有书文件**：`/uploads` **保持现状不改**（可见性风险属既有，本次不处理）。

顺带完成两项遗留待办（用户要求先做完再动游客模式）：
1. 查词弹窗把单词显示了两遍；
2. 桌面端「取词/取句」开关需要快捷键。

现状要点（已核实）：
- 两端路由守卫均以 `localStorage.token` 判定登录态；桌面 `frontend/src/router/PrivateRoute.tsx`、移动 `frontend-mobile/src/router/PrivateRoute.tsx`。
- 桌面 `/` 就是阅读页（`frontend/src/App.tsx` L49），移动 `index` 重定向到 `/reader`。
- `/uploads` 由 `src/main.ts` L37 静态托管，**本来就无鉴权**，游客据此取 epub 文件。
- 书籍有 `isPublic`（`src/book/entities/book.entity.ts` L59-60）；`BookController` 整体挂 `JwtAuthGuard`。
- 查词/翻译/TTS/收藏（`word`/`llm` 模块）、进度上报（`user` 模块 reading-status）全部在 `JwtAuthGuard` 内 → **游客天然 401**，无需改动即可满足「不能调用能力」。

---

## 阶段一：阅读页两项修复（先做）

### 1. 弹窗重复显示单词
- 根因：`frontend/src/components/ShowTranslation.tsx` 头部渲染了 `<span>{text}</span>`（L125-147），而其内部同一行又渲染 `ActionIcons`，`frontend/src/components/ActionIcons.tsx` L148-180 自身也渲染一份 `<span>{text}</span>`（带 TTS 逐词高亮）→ 同一个词出现两次。
- 修法：`ShowTranslation` 仅在 `ActionIcons` 尚未渲染时（即 `loading` 中）显示自己的文本头；加载完成后交由 `ActionIcons` 渲染（保留 TTS 高亮能力）。
  - 即把 L129 的文本头渲染条件由 `showText` 收紧为「`showText && loading`」。
  - 不采用「给 ActionIcons 传 hideText」的方案，因为那样会丢掉 TTS 逐词高亮。

### 2. 取词开关快捷键
- `frontend/src/views/BaseReader.tsx` 增加 `window` `keydown` 监听：`Alt+L` 切换 `themeConfig.lookupEnabled`（走已有的 `handleLookupToggle`）。
- 细节：忽略焦点在 `input`/`textarea`/`contenteditable` 时的按键；命中时 `preventDefault`；随组件卸载移除监听。
- 设置弹层文案补上提示：`取词/取句 (Alt+L):`。

---

## 阶段二：游客模式

### 后端
1. 新增 `src/book/public-book.controller.ts`：`@Controller('books/public')`，**不加** `JwtAuthGuard`。
   - `GET /api/books/public`：公开书列表（分页，复用 `QueryBookDto`）。
   - `GET /api/books/public/:id`：公开书详情（含 `filePath`，游客据此取 `/uploads/<filePath>`）。
2. `src/book/book.service.ts` 新增 `findPublic(query)` / `findPublicOne(id)`：可见性硬编码 `{ isPublic: true, status: 1, deletedAt: null }`；列表沿用 `LIST_PROJECTION` 并补齐 `readerCount`（复用现有 `countReaders`）。
3. `src/book/book.module.ts` 注册新控制器（放在 `BookController` 之前）。
4. `word` / `llm` / `user(reading-status)` 控制器**保持现状**（继续 `JwtAuthGuard`），游客调用返回 401，即「不能调用能力」的服务端兜底。
5. 风险标注：`/uploads` 保持公开是游客阅读的前提；私有书文件理论上可被猜到路径直接下载，属既有风险，本次不改。

### 前端公共逻辑（两端各一份）
新增 `utils/guest.ts`：
- `isGuest()`：`!localStorage.getItem('token')`。
- `readGuestProgress()` / `writeGuestProgress(bookId, cfi)`：读写 localStorage 键 `guestReadingProgress`（形如 `{ [bookId]: cfi }`）。
- `mergeGuestProgress()`：登录成功后调用 —— 取本地进度对应的书，若服务端 `myBookData` 里该书**无位置**才 `PATCH /users/me/reading-status` 上传本地；服务端已有则保留服务端（**不覆盖**，与既有多端进度策略一致）。
- 登录成功后（两端登录页）调用 `mergeGuestProgress()`。

### 桌面端 frontend
- `router/PrivateRoute.tsx`：游客允许访问 `/bookshelf` 与 `/`(阅读页)；其余路由跳 `/login`。游客分支**不调用** `me()`/`fetchBooksByIds`。
- `api/book` 新增 `getPublicBooks()` / `getPublicBookDetail(id)`。
- `views/Bookshelf.tsx`：游客态改调 `getPublicBooks()`；点击书 → `updateUserInfo({ currentBookId, currentBookLoc: 本地进度 })` → 进 `/`。
- `views/BaseReader.tsx`：
  - 书源按登录态二选一（游客用 `getPublicBookDetail`）。
  - 进入时的「拉服务端最新进度」在游客态改为读本地进度。
  - `locationChanged` 游客分支写 localStorage，**不再**调 `updateReadingStatus()`。
  - `selected` / `mousedown` / `mouseup` 开头：游客则「提示登录并 return」（与 `lookupEnabledRef` 同层判断）。
  - 游客无 `currentBookId` 访问 `/` → 重定向 `/bookshelf`。

### 移动端 frontend-mobile
- `router/PrivateRoute.tsx`：同上，游客允许 `/reader`、`/bookshelf`；其余跳 `/login`；游客不调 `me()`。
- `pages/Bookshelf.tsx`：游客态调公开书接口；选书写入 `currentBookId` + 本地进度。
- `pages/Reader.tsx`：
  - 书源与「拉最新进度」按登录态分支（游客读本地进度）。
  - `reportProgress` 游客分支写 localStorage，不调 `flushReadingStatus`。
- `reader/EpubReader.tsx`：手势命中/划词时若为游客 → 提示登录，不打开 `DefinitionSheet`。
- `TabBar`：游客态隐藏受限入口（词汇/句子/我的），或点击提示登录。

### 「提示登录」统一实现
- 桌面用 antd `Modal.confirm`；移动用 `Dialog.confirm`。
- 文案：「登录后可使用查词 / 翻译 / 朗读 / 收藏能力」，确认后 `navigate('/login')`。

---

## Verification

**后端**
- 无 token：`GET /api/books/public`、`/api/books/public/:id` → 200，且只含 `isPublic=true` 的书。
- 无 token：`POST /api/dbmd/superEnglishDict`（翻译）、`/api/tts`、`/api/words` → 401。

**桌面端**
- 清 token 访问 `/` → 跳 `/bookshelf`，显示公开书；选书可正常翻页。
- 划词 → 弹「登录后可用」（不出现翻译层）；TTS/收藏入口同理。
- 阅读进度写入 localStorage；关闭重开仍在原位置。
- 登录后：本地进度合并（服务端该书无记录时应被写入；服务端有记录时保持不变）。

**移动端**（`/m`）同上，另验证 TabBar 受限入口的提示登录。

**回归（重要）**
- 已登录用户全流程不受影响：书架、阅读定位恢复、划词翻译、TTS、收藏、进度云同步。
- 两端 `typecheck` / 构建通过。

**阶段一验证**
- 划词弹窗中单词只出现一次；`Alt+L` 可切换取词开关，设置弹层文案显示快捷键。
