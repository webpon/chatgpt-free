export function getLocalState() {
  const chatKey = localStorage.getItem('chatKey')
  return {
    chatKey: chatKey || '',
    count: 0,
    ipCount: 0,
    serverUrl: 'http://154.40.59.105.84:3001/api',
    type: 'text',
    showVersion: true,
    versionInfo: {
      version: '1.0.5',
      winurl: 'https://xcdn.52chye.cn/static/chatgpt_setup_v1.0.5_win-ia32.exe',
      winurl2: 'https://xcdn.52chye.cn/static/chatgpt-win32-unpack.zip',
      macurl: 'https://xcdn.52chye.cn/static/chatgpt_setup_v1.0.5_mac-arm64.dmg',
      macurl_intel: 'https://xcdn.52chye.cn/static/chatgpt_setup_v1.0.5_mac-x64.dmg',    
      android_url: 'https://xcdn.52chye.cn/static/chatgpt.apk',
      ios_url: ''
    }
  }
}

export function setLocalState(chatKey: string) {
  localStorage.setItem('chatKey', chatKey)
}

