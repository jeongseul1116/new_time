// Browser-only installation and offline support. Native desktop behavior is unchanged.
if (!window.desktopClock?.isDesktop && ['http:', 'https:'].includes(location.protocol)) {
  const base = new URL('./', import.meta.url);
  const installButton = document.getElementById('install-web-app');
  const updateButton = document.getElementById('update-web-app');
  const help = document.getElementById('web-install-help');
  const status = document.getElementById('web-status');
  let promptEvent = null, registration = null, applyingUpdate = false;
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  installButton.hidden = installed();
  const manifest = document.createElement('link');manifest.rel='manifest';manifest.href=new URL('manifest.webmanifest',base);document.head.append(manifest);
  const icon = document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href=new URL('icons/icon.svg',base);document.head.append(icon);
  const touch = document.createElement('link');touch.rel='apple-touch-icon';touch.href=new URL('icons/icon-192.png',base);document.head.append(touch);
  const showOffline = () => {status.hidden=navigator.onLine;status.textContent='오프라인 모드';};
  window.addEventListener('online',showOffline);window.addEventListener('offline',showOffline);showOffline();
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;installButton.hidden=false;});
  window.addEventListener('appinstalled',()=>{promptEvent=null;installButton.hidden=true;navigator.storage?.persist?.().catch(()=>{});});
  installButton.onclick=async()=>{
    if(!promptEvent){help.showModal();return;}
    const event=promptEvent;promptEvent=null;
    await event.prompt();const choice=await event.userChoice;
    if(choice.outcome==='accepted')installButton.hidden=true;
  };
  document.getElementById('close-install-help').onclick=()=>help.close();
  updateButton.onclick=()=>{
    if(!registration?.waiting)return;
    if(!confirm('현재 측정과 입력 내용을 저장하고 새 버전을 적용할까요? 측정은 일시 정지됩니다.'))return;
    if(!window.dispatchEvent(new Event('chagok:prepare-update',{cancelable:true})))return;
    applyingUpdate=true;registration.waiting.postMessage({type:'APPLY_UPDATE'});
  };
  if('serviceWorker' in navigator && window.isSecureContext){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(applyingUpdate)location.reload();});
    navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.href,updateViaCache:'none'}).then(value=>{
      registration=value;
      if(value.waiting)updateButton.hidden=false;
      value.addEventListener('updatefound',()=>{
        const worker=value.installing;
        worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)updateButton.hidden=false;});
      });
    }).catch(()=>{status.hidden=false;status.textContent='오프라인 준비 실패 · 온라인 사용 가능';});
  }
}
