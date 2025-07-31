import { useState, useEffect } from 'react';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallPromptShown, setIsInstallPromptShown] = useState(false);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(false);

  // 检查PWA是否已安装
  const isPWAInstalled = () => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
  };

  // 获取设备信息
  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    const isEdge = /Edg/.test(userAgent);
    const isMobile = /Mobi|Android/i.test(userAgent);
    
    return {
      isIOS,
      isAndroid,
      isSafari,
      isChrome,
      isFirefox,
      isEdge,
      isMobile,
      supportsInstall: isChrome || isEdge || (isAndroid && !isSafari)
    };
  };

  // 显示安装提示
  const showInstallPrompt = () => {
    if (isInstallPromptShown || installPromptDismissed || isPWAInstalled()) {
      return false;
    }
    
    const deviceInfo = getDeviceInfo();
    const lastDismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = lastDismissed ? parseInt(lastDismissed) : 0;
    const now = Date.now();
    
    // 如果用户在24小时内关闭过提示，不再显示
    if (dismissedTime && (now - dismissedTime) < 24 * 60 * 60 * 1000) {
      return false;
    }
    
    // 不支持安装的设备不显示提示
    if (!deviceInfo.supportsInstall && !deviceInfo.isIOS) {
      return false;
    }
    
    setIsInstallPromptShown(true);
    return true;
  };

  // 处理安装
  const handleInstall = async () => {
    const deviceInfo = getDeviceInfo();
    
    if (deviceInfo.isIOS && deviceInfo.isSafari) {
      // iOS Safari 显示安装说明
      alert('要安装此应用：\n1. 点击底部的分享按钮\n2. 选择"添加到主屏幕"\n3. 点击"添加"');
      return { success: false, reason: 'ios_manual' };
    } else if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          console.log('用户接受了安装');
          setDeferredPrompt(null);
          setIsInstallPromptShown(false);
          return { success: true };
        } else {
          console.log('用户拒绝了安装');
          return { success: false, reason: 'user_declined' };
        }
      } catch (error) {
        console.error('安装过程中出错:', error);
        return { success: false, reason: 'error', error };
      }
    } else {
      // 没有原生安装提示，显示手动安装指引
      alert('请在浏览器菜单中选择"添加到主屏幕"或"安装应用"');
      return { success: false, reason: 'no_prompt' };
    }
  };

  // 关闭安装提示
  const dismissInstallPrompt = () => {
    setIsInstallPromptShown(false);
    setInstallPromptDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // 延迟显示安装提示
      setTimeout(() => {
        if (!isPWAInstalled()) {
          showInstallPrompt();
        }
      }, 3000);
    };

    const handleAppInstalled = () => {
      console.log('应用已安装');
      setIsInstallPromptShown(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 检查是否已经安装
    if (isPWAInstalled()) {
      console.log('应用已安装');
    } else {
      // 如果没有安装且没有原生提示，延迟显示自定义提示
      setTimeout(() => {
        if (!deferredPrompt && !isPWAInstalled()) {
          const deviceInfo = getDeviceInfo();
          if (deviceInfo.isIOS || deviceInfo.supportsInstall) {
            showInstallPrompt();
          }
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    deferredPrompt,
    isInstallPromptShown,
    isPWAInstalled: isPWAInstalled(),
    getDeviceInfo,
    handleInstall,
    dismissInstallPrompt,
    showInstallPrompt
  };
};