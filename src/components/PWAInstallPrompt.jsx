import { usePWAInstall } from '../hooks/usePWAInstall';
import './PWAInstallPrompt.scss';

const PWAInstallPrompt = ({ onStartGame }) => {
  const {
    isInstallPromptShown,
    isPWAInstalled,
    getDeviceInfo,
    handleInstall,
    dismissInstallPrompt
  } = usePWAInstall();

  const deviceInfo = getDeviceInfo();

  const handleInstallClick = async () => {
    const result = await handleInstall();
    if (result.success) {
      // 安装成功后可以执行其他操作
    }
  };

  const handlePlayInBrowser = () => {
    dismissInstallPrompt();
    if (onStartGame) {
      onStartGame();
    }
  };

  // 如果已安装或不显示提示，则不渲染
  if (isPWAInstalled || !isInstallPromptShown) {
    return null;
  }

  // 根据设备类型显示不同的提示内容
  let promptText = '将小鸡过马路安装到您的设备';
  let buttonText = '📱 立即安装';
  let description = '安装后可以离线游戏，享受更好的游戏体验！';

  if (deviceInfo.isIOS && deviceInfo.isSafari) {
    promptText = '添加到主屏幕';
    buttonText = '📖 查看说明';
    description = '点击分享按钮，然后选择"添加到主屏幕"即可安装应用';
  }

  return (
    <div className="pwa-install-prompt-overlay">
      <div className="pwa-install-prompt">
        <div className="pwa-install-header">
          <h2>🎮 {promptText}</h2>
          <button 
            className="pwa-close-btn" 
            onClick={dismissInstallPrompt}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        
        <p className="pwa-install-description">{description}</p>
        
        <div className="pwa-install-buttons">
          <button 
            className="pwa-install-now-btn" 
            onClick={handleInstallClick}
          >
            {buttonText}
          </button>
          
          <button 
            className="pwa-play-browser-btn" 
            onClick={handlePlayInBrowser}
          >
            🌐 在浏览器中玩
          </button>
        </div>
        
        {deviceInfo.isMobile && (
          <div className="pwa-device-hint">
            <small>
              {deviceInfo.isIOS 
                ? '💡 iOS用户：使用Safari浏览器获得最佳安装体验' 
                : '💡 安装后可在桌面快速启动游戏'}
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

export default PWAInstallPrompt;