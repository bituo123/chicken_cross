import { useState } from 'react'
import Game from './Game'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import { usePWAInstall } from './hooks/usePWAInstall'
import './styles/App.scss'

function App() {
  const [showGame, setShowGame] = useState(false)
  
  const {
    isPWAInstalled,
    handleInstall
  } = usePWAInstall()

  const handleStartGame = () => {
    setShowGame(true)
  }

  const handleInstallClick = async () => {
    await handleInstall()
  }

  if (showGame) {
    return (
      <>
        <Game 
          onInstall={handleInstallClick} 
          showInstallButton={!isPWAInstalled} 
        />
        <PWAInstallPrompt onStartGame={handleStartGame} />
      </>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>小鸡过马路</h1>
        
        {!isPWAInstalled && (
          <button className="install-button" onClick={handleInstallClick}>
            📱 安装应用
          </button>
        )}

        <button className="start-game-button" onClick={handleStartGame}>
          🐔 开始游戏
        </button>
      </header>

      <PWAInstallPrompt onStartGame={handleStartGame} />
    </div>
  )
}

export default App