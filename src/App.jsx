import { useState, useEffect } from 'react'
import './styles/App.scss'

function App() {
  const [count, setCount] = useState(0)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [test, setTest] = useState('')

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      try {
        // 阻止默认的安装提示
        e.preventDefault()
        console.log(e);
        setTest(JSON.stringify(e))
        // 保存事件以便稍后触发
        setDeferredPrompt(e)
        setShowInstallButton(true)
      } catch (error) {
        alert(1)
        setTest(JSON.stringify(error))
      }
      
    }

    const handleAppInstalled = () => {
      console.log('PWA was installed')
      setShowInstallButton(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // 显示安装提示
    deferredPrompt.prompt()
    
    // 等待用户响应
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }
    
    setDeferredPrompt(null)
    setShowInstallButton(false)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>React + Vite + SCSS PWA</h1>
        <p>asdasdasd{test}</p>
        {showInstallButton && (
          <button className="install-button" onClick={handleInstallClick}>
            📱 安装应用
          </button>
        )}
        
        <div className="counter">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            <iframe src="https://www.bilibili.com/"></iframe>
          </p>
          <p className="pwa-info">
            🚀 这是一个支持离线使用的PWA应用
          </p>
        </div>
      </header>
    </div>
  )
}

export default App