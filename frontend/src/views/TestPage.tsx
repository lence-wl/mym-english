// TtsTestPage.tsx
import React from 'react'
import { useTtsWithWordHighlight } from '../hooks/useTTSPlay'

// 预设音色列表（标注支持情感的英文音色）
const VOICE_LIST = [
  {
    value: 'BV511_streaming',
    label: '慵懒女声-Ava',
    emotionList: ['happy', 'sad', 'angry', 'scare', 'hate', 'surprise'],
  },
  { value: 'BV505_streaming', label: '议论女声-Alicia', emotionList: [] },
  {
    value: 'BV138_streaming',
    label: '情感女声-Lawrence',
    emotionList: [
      'narrator',
      'novel_dialog',
      'happy',
      'sad',
      'angry',
      'scare',
      'hate',
      'surprise',
    ],
  },
  { value: 'BV027_streaming', label: '美式女声-Amelia', emotionList: [] },
  { value: 'BV502_streaming', label: '讲述女声-Amanda', emotionList: [] },
  { value: 'BV503_streaming', label: '活力女声-Ariana', emotionList: [] },
  { value: 'BV504_streaming', label: '活力男声-Jackson', emotionList: [] },
  { value: 'BV421_streaming', label: '天才少女', emotionList: [] },
  { value: 'BV702_streaming', label: 'Stefan', emotionList: [] },
  { value: 'BV506_streaming', label: '天真萌娃-Lily', emotionList: [] },
  {
    value: 'BV040_streaming',
    label: '亲切女声-Anna',
    emotionList: ['happy', 'sad', 'angry', 'scare', 'hate', 'surprise'],
  },
]

// 情感映射（英文转中文）
const EMOTION_MAP = {
  narrator: '旁白',
  novel_dialog: '平和',
  happy: '开心',
  sad: '悲伤',
  angry: '生气',
  scare: '害怕',
  hate: '厌恶',
  surprise: '惊讶',
}

const TtsTestPage: React.FC = () => {
  // 从Hook中获取所有状态和方法
  const {
    // formData,
    loading,
    error,
    audioUrl,
    audioDuration,
    // audioRef,
    // handleInputChange,
    handleSubmit,
    handleDownload,
    handleReset,
    handleAudioPlay,
    handleAudioPause,
    handleAudioTimeUpdate,
    RenderHighlightedText,
  } = useTtsWithWordHighlight({ autoPlay: true })

  // 适配原有事件的参数格式（因为Hook中简化了参数传递）
  const handleFormInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target
    // handleInputChange(value, name)
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '2rem auto',
        padding: '0 1rem',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '2rem' }}>
        火山引擎TTS语音合成测试（逐字高亮版）
      </h1>

      {/* 表单区域 */}
      <div
        style={{
          background: '#f8f9fa',
          padding: '2rem',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: '2rem',
        }}
      >
        {/* 文本输入框 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 600,
              color: '#444',
            }}
          >
            合成文本：
          </label>
          {/* 逐字高亮预览区（播放时显示） */}
          <div
            style={{
              background: '#fff',
              padding: '1rem',
              borderRadius: 4,
              border: '1px solid #ddd',
              marginBottom: '0.8rem',
              minHeight: '60px',
              whiteSpace: 'pre-wrap', // 保留换行和空格
            }}
          >
            {RenderHighlightedText()}
          </div>
          <textarea
            name="text"
            // value={formData.text}
            onChange={handleFormInputChange}
            rows={4}
            style={{
              width: '100%',
              padding: '0.8rem',
              borderRadius: 4,
              border: '1px solid #ddd',
              fontSize: 14,
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
            placeholder="请输入需要合成语音的文本（建议不超过500字）..."
            disabled={loading}
          />
        </div>

        {/* 音色选择 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 600,
              color: '#444',
            }}
          >
            音色选择（支持逐字高亮的音色需标注"✔时间戳"）：
          </label>
          <select
            name="voiceType"
            // value={formData.voiceType}
            onChange={handleFormInputChange}
            style={{
              width: '100%',
              padding: '0.8rem',
              borderRadius: 4,
              border: '1px solid #ddd',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
            disabled={loading}
          >
            {VOICE_LIST.map((voice) => (
              <option key={voice.value} value={voice.value}>
                {voice.label} ({voice.value}){' '}
                {voice.emotionList.length > 0 ? '（支持情感）' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 参数调节区域 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#444',
              }}
            >
              {/* 语速：{formData.speedRatio}x (0.5-2.0) */}
            </label>
            <input
              type="range"
              name="speedRatio"
              min={0.5}
              max={2.0}
              step={0.1}
              // value={formData.speedRatio}
              onChange={handleFormInputChange}
              style={{ width: '100%' }}
              disabled={loading}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#444',
              }}
            >
              {/* 音量：{formData.volumeRatio}x (0-2.0) */}
            </label>
            <input
              type="range"
              name="volumeRatio"
              min={0}
              max={2.0}
              step={0.1}
              // value={formData.volumeRatio}
              onChange={handleFormInputChange}
              style={{ width: '100%' }}
              disabled={loading}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                color: '#444',
              }}
            >
              {/* 音调：{formData.pitchRatio}x (0.5-2.0) */}
            </label>
            <input
              type="range"
              name="pitchRatio"
              min={0.5}
              max={2.0}
              step={0.1}
              // value={formData.pitchRatio}
              onChange={handleFormInputChange}
              style={{ width: '100%' }}
              disabled={loading}
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            // onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '0.8rem 2rem',
              backgroundColor: loading ? '#999' : '#1677ff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              flex: 1,
              maxWidth: 200,
            }}
          >
            {loading ? '合成中...' : '生成语音'}
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            style={{
              padding: '0.8rem 2rem',
              backgroundColor: '#f0f0f0',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              flex: 1,
              maxWidth: 200,
            }}
          >
            重置
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div
            style={{
              marginTop: '1rem',
              color: '#ff4d4f',
              fontSize: 14,
              textAlign: 'center',
              padding: '0.8rem',
              background: '#fff2f2',
              borderRadius: 4,
            }}
          >
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* 音频播放区域 */}
      {audioUrl && (
        <div
          style={{
            background: '#e8f4ff',
            padding: '2rem',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}
        >
          <h3 style={{ color: '#333', marginBottom: '1rem' }}>
            合成结果{' '}
            {audioDuration > 0
              ? `(时长: ${(audioDuration / 1000).toFixed(1)}秒)`
              : ''}
          </h3>
          {/* 音频播放器（绑定播放/暂停/进度事件） */}
          <audio
            // ref={audioRef}
            controls
            style={{ width: '100%', marginBottom: '1rem', outline: 'none' }}
            onPlay={handleAudioPlay}
            onPause={handleAudioPause}
            onTimeUpdate={handleAudioTimeUpdate} // 原生进度事件（优先使用）
            onEnded={() => {
              handleAudioPause()
              // 播放结束后，高亮最后一个字（逻辑在Hook中已处理）
            }}
          >
            <source src={audioUrl} type="audio/mpeg" />
            您的浏览器不支持音频播放，请升级浏览器
          </audio>
          <button
            onClick={handleDownload}
            style={{
              padding: '0.8rem 2rem',
              backgroundColor: '#52c41a',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            下载音频文件 (MP3)
          </button>
        </div>
      )}

      {/* 页面说明 */}
      <div
        style={{
          marginTop: '2rem',
          fontSize: 14,
          color: '#666',
          lineHeight: 1.6,
          padding: '1rem',
          background: '#fafafa',
          borderRadius: 4,
        }}
      >
        <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>
          ℹ️ 逐字高亮使用说明：
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>
            仅支持返回字级别时间戳的音色（如BV511_streaming、BV138_streaming等标注"时间戳✔"的音色）
          </li>
          <li>
            音频播放时，当前朗读的字会以金色高亮显示，跟随播放进度实时更新
          </li>
          <li>文本中的空格、标点符号也会被视为独立字符，按时间戳同步高亮</li>
          <li>
            若逐字高亮不生效，可能是音色不支持或文本与时间戳长度不匹配，请更换音色重试
          </li>
        </ul>
      </div>
    </div>
  )
}

export default TtsTestPage
