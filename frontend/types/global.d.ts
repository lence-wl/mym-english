// 定义 window.jsBridge 接收的消息类型（根据实际业务扩展）
interface JsBridgeMessage {
	type: string;
	[key: string]: any; // 允许其他自定义字段
}

// 定义请求类型（用于 getBookFilePath 等带动作的请求）
interface JsBridgeRequest extends JsBridgeMessage {
	type: 'request';
	action: string; // 具体动作，如 'getBookFilePath'
	params?: { [key: string]: any }; // 请求参数
}

// 定义 window.jsBridge 接口
interface JsBridge {
	/**
	 * 向 Flutter 发送通用消息
	 * @param message 消息内容（字符串或对象）
	 */
	postMessage: (message: string | JsBridgeMessage) => void;
	
	/**
	 * 调用 Flutter 的 Toast 提示
	 * @param message 提示内容
	 */
	showToast: (message: string) => void;
	
	/**
	 * 请求获取图书文件路径（会触发 Flutter 端的回调）
	 */
	getBookFilePath: () => void;
	
	/**
	 * 接收 Flutter 发送的消息（由 Flutter 注入时定义，供内部使用）
	 * @param message 消息内容
	 */
	onMessage?: (message: string | JsBridgeMessage) => void;
}

// 扩展 Window 接口，添加 jsBridge 属性
declare global {
	interface Window {
		/**
		 * Flutter 注入的 JS 桥接对象，用于与原生交互
		 */
		jsBridge: JsBridge;
	}
}


// 确保该文件被视为模块（避免全局类型冲突）
export {};
