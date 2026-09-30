// ===== Firebase 設定：把下面換成你自己專案的設定 =====
const firebaseConfig = {
  apiKey: "AIzaSyDYq1ZV5pQ27JMtHu2xuLob4RjJRGqp94k",
  authDomain: "d-diary-241c0.firebaseapp.com",
  projectId: "d-diary-241c0",
  storageBucket: "d-diary-241c0.firebasestorage.app",
  messagingSenderId: "912462244500",
  appId: "1:912462244500:web:913796f37bfd259106a281"
};
// =====================================================
(function(){
  const configured = !firebaseConfig.apiKey.startsWith("YOUR_");
  const TS_KEY="memoSyncUpdatedAt";
  let db, auth, docRef, unsub, timer, applying=false;
  const getTs=()=>+localStorage.getItem(TS_KEY)||0;

  // --- UI ---
  const st=document.createElement('style');
  st.textContent=`#syncBtn{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:9999;background:#1a2536;color:#dbe6f5;border:1px solid #26344a;border-radius:20px;padding:8px 14px;font-size:13px;cursor:pointer}
  #syncPanel{position:fixed;right:14px;bottom:calc(60px + env(safe-area-inset-bottom,0px));z-index:9999;background:#131c2b;color:#dbe6f5;border:1px solid #26344a;border-radius:12px;padding:14px;width:260px;display:none;font-size:14px}
  #syncPanel input{width:100%;box-sizing:border-box;margin:4px 0;padding:8px;border-radius:8px;border:1px solid #26344a;background:#0d1420;color:#dbe6f5;font-size:16px}
  #syncPanel button{margin:6px 6px 0 0;padding:7px 12px;border-radius:8px;border:0;background:#3b82f6;color:#fff;cursor:pointer}
  #syncPanel .msg{margin-top:8px;font-size:12px;opacity:.8}`;
  document.head.appendChild(st);
  const btn=document.createElement('div');btn.id='syncBtn';btn.textContent='☁ 同步';
  const panel=document.createElement('div');panel.id='syncPanel';
  document.body.append(btn,panel);
  btn.onclick=()=>{panel.style.display=panel.style.display==='block'?'none':'block';};
  const setBtn=t=>btn.textContent=t;
  const msg=t=>{const m=panel.querySelector('.msg');if(m)m.textContent=t;};

  function drawLoggedOut(){
    panel.innerHTML=`<div>登入後電腦與手機自動同步</div>
    <input id="sEmail" type="email" placeholder="Email" autocomplete="username">
    <input id="sPw" type="password" placeholder="密碼（至少6碼）" autocomplete="current-password">
    <button id="sLogin">登入</button><button id="sSign" style="background:#334155">註冊</button><div class="msg"></div>`;
    panel.querySelector('#sLogin').onclick=()=>auth.signInWithEmailAndPassword(v('sEmail'),v('sPw')).catch(e=>msg(e.message));
    panel.querySelector('#sSign').onclick=()=>auth.createUserWithEmailAndPassword(v('sEmail'),v('sPw')).catch(e=>msg(e.message));
  }
  const v=id=>panel.querySelector('#'+id).value.trim();
  function drawLoggedIn(u){
    panel.innerHTML=`<div>已登入：${u.email}</div><div class="msg">同步中…</div><button id="sOut" style="background:#334155">登出</button>`;
    panel.querySelector('#sOut').onclick=()=>auth.signOut();
  }

  // --- 同步邏輯（以最後修改時間為準）---
  function push(){
    const s=window.__memoApp.getState();
    const ts=getTs();
    docRef.set({data:JSON.stringify(s),updatedAt:ts}).then(()=>{setBtn('☁ 已同步');msg('已同步 '+new Date().toLocaleTimeString());}).catch(e=>{setBtn('☁ 同步失敗');msg(e.message);});
  }
  window.__memoSync={
    onLocalSave(){
      if(applying||!docRef)return;
      localStorage.setItem(TS_KEY,Date.now());
      setBtn('☁ 同步中…');
      clearTimeout(timer);timer=setTimeout(push,1000);
    }
  };
  function start(u){
    docRef=db.collection('users').doc(u.uid);
    unsub=docRef.onSnapshot(snap=>{
      if(snap.metadata.hasPendingWrites)return;
      if(!snap.exists){push();return;}
      const r=snap.data();
      if(r.updatedAt>getTs()){
        applying=true;
        try{window.__memoApp.applyRemote(JSON.parse(r.data));localStorage.setItem(TS_KEY,r.updatedAt);}finally{applying=false;}
        setBtn('☁ 已同步');msg('已從雲端更新 '+new Date().toLocaleTimeString());
      }else if(r.updatedAt<getTs()){push();}
      else{setBtn('☁ 已同步');}
    },e=>{setBtn('☁ 同步失敗');msg(e.message);});
  }

  if(!configured){
    panel.innerHTML='<div>尚未設定 Firebase。請編輯 sync.js 填入你的設定。</div>';
    return;
  }
  firebase.initializeApp(firebaseConfig);
  auth=firebase.auth();db=firebase.firestore();
  auth.onAuthStateChanged(u=>{
    if(unsub){unsub();unsub=null;}
    if(u){drawLoggedIn(u);setBtn('☁ 連線中…');start(u);}
    else{docRef=null;setBtn('☁ 登入同步');drawLoggedOut();}
  });
})();
