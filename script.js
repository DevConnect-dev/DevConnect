const SUPABASE_URL='https://ekezdtageniidwjlgyys.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZXpkdGFnZW5paWR3amxneXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMTg3NDgsImV4cCI6MjA5NDU5NDc0OH0.aolWqRWGp2sJyHsm3vFNx6wVEyt1uEc7rM5i4fDgb88';
const{createClient}=supabase;
const db=createClient(SUPABASE_URL,SUPABASE_KEY);

let currentUser=null,currentProfile=null,currentSection='home',selectedSpecialty=null,selectedTags=[],currentStep=0,currentChannel='général',challengeId=null,currentDmConvId=null,currentDmUser=null,isDmMode=false,dmRealtimeSub=null,channelRealtimeSub=null;

// INIT
window.addEventListener('load',async()=>{
  initTheme();
  initLandingFx();
  updateGradientPreview();
  // Restaurer le gradient du site si DevConnect+
  const _sg=localStorage.getItem('dc_site_gradient');
  if(_sg){try{const g=JSON.parse(_sg);applySiteGradient(g[0],g[1],g[2]);}catch(e){}}
  const{data:{session}}=await db.auth.getSession();
  if(session){currentUser=session.user;await loadProfile();showPage('app');loadFeed();loadSidebarLeaderboard();loadActiveAnnouncementBanner();}
  else showPage('landing');
  db.auth.onAuthStateChange(async(event,session)=>{
    if(event==='SIGNED_IN'){currentUser=session.user;await loadProfile();showPage('app');loadFeed();loadSidebarLeaderboard();loadActiveAnnouncementBanner();}
    else if(event==='SIGNED_OUT'){currentUser=null;currentProfile=null;showPage('landing');}
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeSearch();closeChallenge();}
    if(e.key==='/'&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA'){e.preventDefault();openSearch();}
  });
  initKeyboard();
});

// PAGES
function showPage(p){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById('page-'+p)?.classList.add('active');}
function showAuth(t){showPage('auth');switchAuthTab(t);}

// AUTH
function switchAuthTab(t){
  document.getElementById('auth-login').style.display=t==='login'?'block':'none';
  document.getElementById('auth-register').style.display=t==='register'?'block':'none';
  document.querySelectorAll('.auth-tab').forEach((x,i)=>x.classList.toggle('active',(t==='login'&&i===0)||(t==='register'&&i===1)));
}

async function handleLogin(){
  const email=document.getElementById('login-email').value.trim();
  const pass=document.getElementById('login-password').value;
  const err=document.getElementById('login-error');
  err.classList.remove('show');
  if(!email||!pass){err.textContent='Remplis tous les champs.';err.classList.add('show');return;}
  const{error}=await db.auth.signInWithPassword({email,password:pass});
  if(error){
    const isUnconfirmed=error.message?.toLowerCase().includes('email not confirmed')||error.message?.toLowerCase().includes('not confirmed');
    err.textContent=isUnconfirmed
      ? 'Tu dois confirmer ton email avant de te connecter. Vérifie ta boîte mail (et tes spams).'
      : 'Email ou mot de passe incorrect.';
    err.classList.add('show');
  }
}

async function handleForgotPassword(){
  const email=document.getElementById('login-email').value.trim();
  if(!email){
    const err=document.getElementById('login-error');
    err.textContent='Entre ton email ci-dessus puis clique sur "Mot de passe oublié".';
    err.classList.add('show');
    return;
  }
  const{error}=await db.auth.resetPasswordForEmail(email,{redirectTo:window.location.href});
  if(error){showToast('Erreur : '+error.message,'error');return;}
  showToast('Email de réinitialisation envoyé ! Vérifie ta boîte mail.','success');
}

function nextStep(step){
  const err=document.getElementById('reg-error-'+currentStep);
  err.classList.remove('show');
  if(step>currentStep){
    if(currentStep===0){
      const u=document.getElementById('reg-username').value.trim();
      const e=document.getElementById('reg-email').value.trim();
      const p=document.getElementById('reg-password').value;
      if(!u||!e||!p){err.textContent='Remplis tous les champs.';err.classList.add('show');return;}
      if(p.length<8){err.textContent='Mot de passe trop court (8 min).';err.classList.add('show');return;}
    }
    if(currentStep===1&&step===2){
      if(!selectedSpecialty){document.getElementById('reg-error-1').textContent='Choisis une spécialité.';document.getElementById('reg-error-1').classList.add('show');return;}
      loadTechTags();
    }
  }
  document.getElementById('step-'+currentStep).classList.remove('active');
  document.getElementById('step-dot-'+currentStep).classList.remove('active');
  document.getElementById('step-dot-'+currentStep).classList.add('done');
  currentStep=step;
  document.getElementById('step-'+step).classList.add('active');
  document.getElementById('step-dot-'+step).classList.add('active');
}

function selectSpecialty(el,v){document.querySelectorAll('.specialty-item').forEach(i=>i.classList.remove('selected'));el.classList.add('selected');selectedSpecialty=v;}

function loadTechTags(){
  const tags={web_dev:['HTML','CSS','JavaScript','TypeScript','React','Vue','Angular','Next.js','Node.js','PHP','Tailwind','Sass'],mobile_dev:['React Native','Flutter','Swift','Kotlin','Expo','iOS','Android'],backend_dev:['Node.js','Python','Java','Go','Rust','C#','PostgreSQL','MongoDB','Redis','Docker'],fullstack_dev:['React','Node.js','TypeScript','PostgreSQL','Docker','Next.js','Python'],cybersecurity:['Pentest','OSINT','Forensics','Malware Analysis','Network Security','CTF','Bug Bounty','OWASP','Metasploit','Kali Linux','Burp Suite','Wireshark','Nmap','Social Engineering','Cryptographie','Reverse Engineering'],devops:['Docker','Kubernetes','CI/CD','AWS','GCP','Azure','Terraform','Ansible','Linux','Bash','GitHub Actions'],data:['Python','SQL','Pandas','Spark','Power BI','Tableau','Airflow','BigQuery','Snowflake'],ai_ml:['Python','TensorFlow','PyTorch','Scikit-learn','LLM','Hugging Face','OpenAI API','RAG','Computer Vision','NLP'],designer_ux:['Figma','Adobe XD','Prototypage','Design System','UX Research','Framer'],recruiter:['Tech Recruiting','Sourcing','LinkedIn Recruiter','Entretien technique'],other:['JavaScript','Python','Git','Linux','Docker']};
  const list=tags[selectedSpecialty]||tags.other;
  document.getElementById('tech-tags').innerHTML=list.map(t=>`<div class="tag-item" onclick="toggleTag(this,'${t}')">${t}</div>`).join('');
  selectedTags=[];
}

function toggleTag(el,tag){el.classList.toggle('selected');if(el.classList.contains('selected'))selectedTags.push(tag);else selectedTags=selectedTags.filter(t=>t!==tag);}

async function handleRegister(){
  const username=document.getElementById('reg-username').value.trim();
  const email=document.getElementById('reg-email').value.trim();
  const pass=document.getElementById('reg-password').value;
  const level=document.getElementById('reg-level').value;
  const err=document.getElementById('reg-error-2');
  err.classList.remove('show');
  // Validation username
  if(username.length<3||username.length>24){err.textContent='Le pseudo doit faire entre 3 et 24 caractères.';err.classList.add('show');return;}
  if(!/^[a-zA-Z0-9_.\- ]+$/.test(username)){err.textContent='Pseudo invalide (lettres, chiffres, _ . - et espace uniquement).';err.classList.add('show');return;}
  const forbidden=['architect','admin','moderator','devconnect','support','staff','system','root','bot'];
  if(forbidden.includes(username.toLowerCase())){err.textContent='Ce pseudo est réservé.';err.classList.add('show');return;}
  if(pass.length<8){err.textContent='Mot de passe trop court (8 caractères minimum).';err.classList.add('show');return;}
  const roleFromSpecialty=selectedSpecialty||'web_dev';
  const{data,error}=await db.auth.signUp({email,password:pass,options:{data:{username,specialty:selectedSpecialty,tech_stack:selectedTags,level,role:roleFromSpecialty}}});
  if(error){err.textContent=error.message;err.classList.add('show');return;}
  // Si pas de session ET pas d'identityData = email déjà utilisé (faux succès Supabase)
  if(!data.session && !data.user?.identities?.length){
    err.textContent='Cet email est déjà utilisé. Connecte-toi avec tes identifiants.';
    err.classList.add('show');
    setTimeout(()=>switchAuthTab('login'),2000);
    return;
  }
  if(data.session){
    showToast('Compte créé ! Bienvenue sur DevConnect 🎉','success');
  } else {
    showToast('Compte créé ! Confirme ton email avant de te connecter.','success');
  }
  setTimeout(()=>switchAuthTab('login'),2500);
}

// PROFILE
const WIDGET_LABELS={stats:'📊 Stats',badges:'🏆 Badges',activity:'🎮 Activité',avail:'🌍 Disponibilité'};

async function loadProfile(){
  if(!currentUser)return;
  let{data}=await db.from('profiles').select('*').eq('id',currentUser.id).maybeSingle();
  if(!data){
    const meta=currentUser.user_metadata||{};
    const roleDefault=meta.role||meta.specialty||'web_dev';
    const{data:created,error}=await db.from('profiles').insert({id:currentUser.id,username:meta.username||currentUser.email.split('@')[0],email:currentUser.email,specialty:meta.specialty||null,role:roleDefault}).select().maybeSingle();
    if(error){showToast('Impossible de charger ton profil. Contacte un admin.','error');return;}
    data=created;
  }
  if(data){currentProfile=data;updateNavAvatar();updateProfileSection();updateSettingsSection();checkArchitect();updateNotifBadge();subscribeNotifications();subscribeDmListRealtime();}
}

function isDevPlus(){return!!(currentProfile?.is_premium||currentProfile?.premium_tier==='devconnect-plus');}
function isDevConnectPlus(){return currentProfile?.premium_tier==='devconnect-plus';}

function avatarHtml(url,initials){return url?`<img src="${esc(url)}" alt="avatar">`:esc(initials);}

function updateNavAvatar(){
  if(!currentProfile)return;
  const init=(currentProfile.username||'DC').substring(0,2).toUpperCase();
  document.getElementById('nav-avatar').innerHTML=avatarHtml(currentProfile.avatar_url,init);
}

function updateProfileSection(){
  if(!currentProfile)return;
  const p=currentProfile;
  const specLabels={web_dev:'Dev Web',mobile_dev:'Dev Mobile',backend_dev:'Dev Backend',fullstack_dev:'Fullstack',cybersecurity:'Cybersécurité',devops:'DevOps',data:'Data',ai_ml:'IA / ML',designer_ux:'Designer UX',recruiter:'Recruteur tech'};
  setEl('profile-display-name',p.display_name||p.username||'Utilisateur');
  setEl('profile-username-display','@'+(p.username||''));
  setEl('profile-bio-display',p.bio||'Aucune bio renseignée.');
  setEl('profile-xp',p.xp||0);
  setEl('profile-streak',p.streak||0);
  if(p.specialty)setEl('profile-specialty-badge',specLabels[p.specialty]||p.specialty);
  if(p.github_url){const el=document.getElementById('profile-github-link');if(el){el.href=safeUrl(p.github_url);el.style.display='inline-flex';}}
  if(p.linkedin_url){const el=document.getElementById('profile-linkedin-link');if(el){el.href=safeUrl(p.linkedin_url);el.style.display='inline-flex';}}
  if(p.portfolio_url){const el=document.getElementById('profile-portfolio-link');if(el){el.href=safeUrl(p.portfolio_url);el.style.display='inline-flex';}}

  const init=(p.username||'DC').substring(0,2).toUpperCase();
  document.getElementById('profile-avatar-big').innerHTML=avatarHtml(p.avatar_url,init);

  const banner=document.getElementById('profile-banner');
  if(isDevPlus()&&p.banner_url){banner.style.background=`url('${safeUrl(p.banner_url)}') center/cover no-repeat`;}
  else if(isDevPlus()&&p.banner_gradient){const g=String(p.banner_gradient||'');if(/^linear-gradient\(/.test(g)||/^radial-gradient\(/.test(g))banner.style.background=g;}
  else if(isDevPlus()&&p.profile_color){const c=safeCssColor(p.profile_color);if(c)banner.style.background=c;}
  else{banner.style.background='linear-gradient(135deg,var(--bg3),var(--bg2))';}

  // Pronoms
  const pronounsEl=document.getElementById('profile-pronouns-display');
  if(pronounsEl){if(p.pronouns){pronounsEl.textContent=p.pronouns;pronounsEl.style.display='block';}else{pronounsEl.style.display='none';}}

  // Badge rôle inline
  const roleEl=document.getElementById('profile-role-badge');
  if(roleEl&&p.role){roleEl.className=`role-badge-profile ${p.role}`;roleEl.textContent=ROLE_LABELS[p.role]||p.role;roleEl.style.display='inline-flex';}

  const pill=document.getElementById('profile-status-pill');
  if(isDevConnectPlus()&&p.status_text){pill.style.display='inline-flex';pill.textContent='';
    if(p.custom_emoji_url){const img=document.createElement('img');img.src=p.custom_emoji_url;img.className='profile-emoji-img';pill.appendChild(img);}
    pill.appendChild(document.createTextNode(p.status_text));
  }else{pill.style.display='none';}

  renderProfileWidgets(p);
  renderBadgesTab(p);
  updateLivePreview();
}

function renderProfileWidgets(p){
  const c=document.getElementById('profile-widgets');
  c.innerHTML='';
  if(!isDevConnectPlus())return;
  const w=p.widgets&&typeof p.widgets==='object'&&!Array.isArray(p.widgets)?p.widgets:{};
  const enabled=w.enabled||[];
  if(enabled.includes('stats')){
    c.innerHTML+=`<div class="profile-widget-card"><div class="widget-title">📊 Stats</div><div style="font-size:13px;margin-top:4px">${p.xp||0} XP · ${p.streak||0} jours de streak</div></div>`;
  }
  if(enabled.includes('badges')){
    c.innerHTML+=`<div class="profile-widget-card"><div class="widget-title">🏆 Derniers badges</div><div style="font-size:13px;margin-top:4px">Fondateur</div></div>`;
  }
  if(enabled.includes('activity')&&w.activity_text){
    c.innerHTML+=`<div class="profile-widget-card"><div class="widget-title">🎮 Activité</div><div style="font-size:13px;margin-top:4px">${esc(w.activity_text)}</div></div>`;
  }
  if(enabled.includes('avail')&&w.available!==undefined&&w.available!==null){
    c.innerHTML+=`<div class="profile-widget-card"><div class="widget-title">🌍 Disponibilité</div><div style="font-size:13px;margin-top:4px">${w.available?'Dispo pour mission':'Non disponible'}</div></div>`;
  }
}

function toggleWidgetSubfield(name){
  const on=document.getElementById('w-'+name).classList.contains('on');
  document.getElementById('w-'+name+'-field').style.display=on?'block':'none';
}

function updatePremiumStatus(){
  if(!currentProfile)return;
  const p=currentProfile;
  const nameEl=document.getElementById('premium-status-name');
  const descEl=document.getElementById('premium-status-desc');
  const cardEl=document.getElementById('premium-status-card');
  if(p.premium_tier==='devconnect-plus'){
    if(nameEl)nameEl.innerHTML='<span class="premium-badge devconnectplus">DevConnect+</span> Actif';
    if(descEl)descEl.textContent='Tu bénéficies de tous les avantages DevConnect+.';
    if(cardEl)cardEl.style.borderColor='var(--accent-dim)';
  } else if(p.is_premium){
    if(nameEl)nameEl.innerHTML='<span class="premium-badge devplus">Dev+</span> Actif';
    if(descEl)descEl.textContent='Tu bénéficies des avantages Dev+.';
  } else {
    if(nameEl)nameEl.textContent='Membre standard';
    if(descEl)descEl.textContent='Aucun abonnement premium actif.';
  }
}

async function togglePrivacySetting(btn, field){
  const prevOn=btn.classList.contains('on');
  btn.classList.toggle('on');
  const val=btn.classList.contains('on');
  const{error}=await db.from('profiles').update({[field]:val}).eq('id',currentUser.id);
  if(error){
    btn.classList.toggle('on',prevOn); // on remet l'état précédent si ça échoue
    showToast('Erreur lors de la sauvegarde : '+error.message,'error');
    return;
  }
  if(currentProfile)currentProfile[field]=val;
  showToast('Préférence mise à jour.','success');
}

const NOTIF_PREF_KEY='dc_notif_prefs';
function getNotifPrefs(){
  try{return JSON.parse(localStorage.getItem(NOTIF_PREF_KEY)||'{}');}catch(e){return{};}
}
function toggleNotifPref(btn,key){
  btn.classList.toggle('on');
  const prefs=getNotifPrefs();
  prefs[key]=btn.classList.contains('on');
  localStorage.setItem(NOTIF_PREF_KEY,JSON.stringify(prefs));
  showToast('Préférence de notification mise à jour.','success');
}
function syncNotifToggles(){
  const prefs=getNotifPrefs();
  const defaults={mentions:true,dms:true,likes:true,follows:true,challenges:true,recruit:false,updates:true};
  Object.entries(defaults).forEach(([k,def])=>{
    const el=document.getElementById('notif-'+k);
    if(el)el.classList.toggle('on',prefs[k]!==undefined?prefs[k]:def);
  });
}
function notifPrefEnabled(key){
  const prefs=getNotifPrefs();
  const defaults={mentions:true,dms:true,likes:true,follows:true,challenges:true,recruit:false,updates:true};
  return prefs[key]!==undefined?prefs[key]:defaults[key]!==false;
}

function updateSettingsSection(){
  if(!currentProfile)return;
  const p=currentProfile;
  setVal('s-username',p.username||'');setVal('s-bio',p.bio||'');setVal('s-title',p.title||'');
  setVal('s-displayname',p.display_name||p.username||'');
  setVal('s-github',p.github_url||'');setVal('s-linkedin',p.linkedin_url||'');setVal('s-portfolio',p.portfolio_url||'');
  setVal('s-pronouns',p.pronouns||'');
  setVal('s-specialty',p.specialty||'web_dev');
  currentSkills=Array.isArray(p.tech_stack)?[...p.tech_stack]:[];
  renderSkillTags();
  setEl('s-email-display',currentUser.email||'—');
  setEl('s-since',new Date(p.created_at).toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'}));
  setEl('s-userid',currentUser.id||'—');
  setEl('s-avatar-username',p.username||'—');
  setEl('s-avatar-role',ROLE_LABELS[p.role]||p.role||'Membre');
  updatePremiumStatus();

  const init=(p.username||'DC').substring(0,2).toUpperCase();
  document.getElementById('s-avatar-preview').innerHTML=avatarHtml(p.avatar_url,init);

  const devPlus=isDevPlus(),dcPlus=isDevConnectPlus();
  document.getElementById('dc-plus-locked').style.display=dcPlus?'none':'block';
  document.getElementById('dc-plus-unlocked').style.display=dcPlus?'block':'none';

  setVal('s-profile-color',p.profile_color||'#0e0e0e');

  // Banner Dev+
  document.getElementById('dev-plus-banner-locked').style.display=devPlus?'none':'block';
  document.getElementById('dev-plus-banner-unlocked').style.display=devPlus?'block':'none';
  // Banner GIF DevConnect+
  document.getElementById('dc-banner-locked').style.display=dcPlus?'none':'block';
  document.getElementById('dc-banner-unlocked').style.display=dcPlus?'block':'none';
  // Fond du site DevConnect+
  document.getElementById('site-bg-locked').style.display=dcPlus?'none':'block';
  document.getElementById('site-bg-unlocked').style.display=dcPlus?'block':'none';

  if(devPlus){
    const bPrev=document.getElementById('s-banner-preview');
    if(bPrev)bPrev.style.background=p.banner_url?`url('${safeUrl(p.banner_url)}') center/cover`:'var(--bg2)';
  }
  // Init gradient
  const savedGrad=localStorage.getItem('dc_site_gradient');
  if(savedGrad){
    try{const g=JSON.parse(savedGrad);setVal('grad-color-1',g[0]);setVal('grad-color-2',g[1]);setVal('grad-color-3',g[2]);}catch(e){}
  }
  updateGradientPreview();
  if(dcPlus){
    setVal('s-status',p.status_text||'');
    document.getElementById('s-emoji-preview').innerHTML=p.custom_emoji_url?`<img src="${esc(p.custom_emoji_url)}" style="width:100%;height:100%;object-fit:contain">`:'';
    const w=p.widgets&&typeof p.widgets==='object'&&!Array.isArray(p.widgets)?p.widgets:{};
    const enabled=w.enabled||[];
    ['stats','badges','activity','avail'].forEach(k=>{document.getElementById('w-'+k).classList.toggle('on',enabled.includes(k));});
    setVal('s-activity-text',w.activity_text||'');
    if(w.available!==undefined&&w.available!==null)setVal('s-avail-status',String(w.available));
    toggleWidgetSubfield('activity');toggleWidgetSubfield('avail');
  }
  // Sync privacy toggles with actual saved values
  const tog=(id,val)=>{const el=document.getElementById(id);if(el){el.classList.toggle('on',!!val);}};
  tog('toggle-public-profile',currentProfile.is_public!==false);
  tog('toggle-block-dms',!!currentProfile.block_dms);
  tog('toggle-hide-xp',!!currentProfile.hide_xp);
  tog('toggle-pairing',!!currentProfile.available_for_pairing);
  // Sync notif prefs (saved in localStorage for immediate responsiveness)
  syncNotifToggles();
}

function switchSettingsByName(s){
  const el=[...document.querySelectorAll('.settings-nav-item')].find(n=>n.getAttribute('onclick')?.includes(`'${s}'`));
  if(el)switchSettings(el,s);
}

function validateImageFile(file,maxBytes,allowGif){
  const okTypes=allowGif?['image/png','image/jpeg','image/webp','image/gif']:['image/png','image/jpeg','image/webp'];
  if(!okTypes.includes(file.type)){showToast(allowGif?'Format non supporté.':'Format non supporté (pas de GIF/vidéo).','error');return false;}
  if(file.size>maxBytes){showToast('Fichier trop lourd ('+Math.round(maxBytes/1024/1024*10)/10+' Mo max).','error');return false;}
  return true;
}

async function uploadToBucket(bucket,file){
  const ext=file.name.split('.').pop();
  const path=`${currentUser.id}/${bucket}-${Date.now()}.${ext}`;
  const{error}=await db.storage.from(bucket).upload(path,file,{upsert:true});
  if(error){showToast('Erreur upload : '+error.message,'error');return null;}
  const{data}=db.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadAvatar(input){
  const file=input.files[0];if(!file)return;
  if(!validateImageFile(file,2*1024*1024,false))return;
  const url=await uploadToBucket('avatars',file);if(!url)return;
  const{error}=await db.from('profiles').update({avatar_url:url}).eq('id',currentUser.id);
  if(error){showToast('Erreur lors de la sauvegarde.','error');return;}
  await loadProfile();showToast('Photo de profil mise à jour !','success');
}

async function uploadBanner(input){
  if(!isDevPlus()){showToast('Réservé aux membres Dev+.','error');return;}
  const file=input.files[0];if(!file)return;
  if(!validateImageFile(file,3*1024*1024,false))return;
  showToast('Upload en cours...','info');
  const url=await uploadToBucket('banners',file);if(!url)return;
  const{error}=await db.from('profiles').update({banner_url:url,banner_gradient:null}).eq('id',currentUser.id);
  if(error){showToast('Erreur : '+error.message,'error');return;}
  await loadProfile();showToast('Bannière mise à jour !','success');
}

async function uploadEmoji(input){
  if(!isDevConnectPlus()){showToast('Réservé aux membres DevConnect+.','error');return;}
  const file=input.files[0];if(!file)return;
  if(!validateImageFile(file,256*1024,true))return;
  showToast('Upload en cours...','info');
  const url=await uploadToBucket('emojis',file);if(!url)return;
  const{error}=await db.from('profiles').update({custom_emoji_url:url}).eq('id',currentUser.id);
  if(error){showToast('Erreur : '+error.message,'error');return;}
  await loadProfile();showToast('Emoji mis à jour !','success');
}

async function updateProfileColor(value){
  if(!isDevPlus()){showToast('Réservé aux membres Dev+.','error');return;}
  const{error}=await db.from('profiles').update({profile_color:value}).eq('id',currentUser.id);
  if(error){showToast('Erreur lors de la sauvegarde.','error');return;}
  await loadProfile();
}

async function saveAppearanceExtras(){
  if(!isDevConnectPlus()){showToast('Réservé aux membres DevConnect+.','error');return;}
  const enabled=['stats','badges','activity','avail'].filter(k=>document.getElementById('w-'+k).classList.contains('on'));
  const widgets={enabled,activity_text:getVal('s-activity-text'),available:enabled.includes('avail')?getVal('s-avail-status')==='true':null};
  const{error}=await db.from('profiles').update({status_text:getVal('s-status'),widgets,updated_at:new Date().toISOString()}).eq('id',currentUser.id);
  if(error){showToast('Erreur lors de la sauvegarde.','error');return;}
  await loadProfile();showToast('Apparence mise à jour !','success');
}

const ROLE_LABELS={
  architect:'Architect',admin:'Administrateur',
  responsable_modo:'Responsable Modération',moderator_senior:'Modérateur Senior',moderator:'Modérateur',moderator_junior:'Modérateur Junior',
  community_manager:'Gestionnaire Communauté',content_manager:'Gestionnaire Contenu',staff:'Staff',
  core_dev:'Core Dev',designer_team:'Designer UI/UX',security_team:'Security',devops_team:'DevOps',data_analyst:'Data Analyst',
  web_dev:'Dev Web',mobile_dev:'Dev Mobile',backend_dev:'Dev Backend',fullstack_dev:'Fullstack',
  cybersecurity:'Cybersécurité',devops:'DevOps',data:'Data',ai_ml:'IA / ML',designer_ux:'Designer UX',recruiter:'Recruteur tech'
};

const ROLE_HIERARCHY={
  architect:100,admin:90,
  responsable_modo:75,moderator_senior:65,moderator:55,moderator_junior:45,
  community_manager:40,content_manager:38,staff:20,
  core_dev:30,designer_team:30,security_team:30,devops_team:30,data_analyst:30,
  web_dev:10,mobile_dev:10,backend_dev:10,fullstack_dev:10,
  cybersecurity:10,devops:10,data:10,ai_ml:10,designer_ux:10,recruiter:10
};

function getRoleLevel(role){return ROLE_HIERARCHY[role]||0;}
function canActOn(actorRole, targetRole){
  // Un acteur ne peut agir que sur un rôle strictement inférieur au sien
  return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}
function checkHierarchy(targetUsername, targetRole, action){
  const myRole = currentProfile?.role;
  if(!canActOn(myRole, targetRole)){
    showToast(`Impossible — @${targetUsername} a un rang supérieur ou égal au tien.`, 'error');
    return false;
  }
  return true;
}

function checkArchitect(){
  const role=currentProfile?.role;
  const adminRoles=['architect','admin','responsable_modo','moderator_senior','moderator','moderator_junior','community_manager','content_manager','staff'];
  const isAdmin=adminRoles.includes(role);
  const adminNav=document.getElementById('nav-admin');
  const badge=document.getElementById('profile-role-badge');
  if(isAdmin){
    if(adminNav)adminNav.style.display='flex';
    if(badge){badge.style.display='inline';badge.textContent=ROLE_LABELS[role]||'Admin';}
  }else{
    if(adminNav)adminNav.style.display='none';
    if(badge)badge.style.display='none';
  }
  setEl('admin-welcome-role',ROLE_LABELS[role]||'Admin');
}
  // Premium & Rôles : réservés à admin/architect, pas aux modérateurs
  const navPremium=document.getElementById('admin-nav-premium');
  const navRoles=document.getElementById('admin-nav-roles');
  if(navPremium)navPremium.style.display=isFullAdmin?'flex':'none';
  if(navRoles)navRoles.style.display=isFullAdmin?'flex':'none';
  setEl('admin-welcome-role',ROLE_LABELS[role]||'Admin');
}

let currentSkills=[];
function renderSkillTags(){
  const box=document.getElementById('s-skills-tags');
  if(!box)return;
  box.innerHTML=currentSkills.map((s,i)=>`<span class="stack-tag" style="display:inline-flex;align-items:center;gap:5px">${esc(s)}<span style="cursor:pointer;opacity:.6" onclick="removeSkillTag(${i})">×</span></span>`).join('')||'<span style="color:var(--text-muted);font-size:12px">Aucune compétence ajoutée.</span>';
}
function addSkillTag(){
  const input=document.getElementById('s-skill-input');
  const val=(input.value||'').trim();
  if(!val)return;
  if(currentSkills.length>=12){showToast('12 compétences maximum.','error');return;}
  if(!currentSkills.some(s=>s.toLowerCase()===val.toLowerCase()))currentSkills.push(val);
  input.value='';
  renderSkillTags();
}
function removeSkillTag(i){currentSkills.splice(i,1);renderSkillTags();}

async function saveProfile(){
  if(!currentUser)return;
  const{error}=await db.from('profiles').update({username:getVal('s-username'),display_name:getVal('s-displayname').trim()||getVal('s-username'),bio:getVal('s-bio'),title:getVal('s-title'),github_url:getVal('s-github'),linkedin_url:getVal('s-linkedin'),portfolio_url:getVal('s-portfolio'),specialty:getVal('s-specialty'),tech_stack:currentSkills,updated_at:new Date().toISOString()}).eq('id',currentUser.id);
  if(error){showToast('Erreur lors de la sauvegarde.','error');return;}
  await loadProfile();showToast('Profil mis à jour !','success');
}

async function changePassword(){
  const np=getVal('s-new-pass'),cp=getVal('s-confirm-pass');
  if(!np||np!==cp){showToast('Les mots de passe ne correspondent pas.','error');return;}
  if(np.length<8){showToast('Mot de passe trop court.','error');return;}
  const{error}=await db.auth.updateUser({password:np});
  if(error){showToast('Erreur : '+error.message,'error');return;}
  showToast('Mot de passe changé !','success');
}

async function handleLogout(){
  // Nettoyage des résidus localStorage
  ['dc_sess','dc_logs','dc_vip_settings','dc_vip_theme','dc_vip_color','dc_modchat'].forEach(k=>localStorage.removeItem(k));
  await db.auth.signOut();
  showToast('Déconnecté.','info');
}

function certifBadge(){return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="display:inline;vertical-align:middle;margin-left:3px" title="Membre certifié"><path d="M12 2L14.4 8.26L21 9.27L16.5 13.64L17.76 20.23L12 17L6.24 20.23L7.5 13.64L3 9.27L9.6 8.26L12 2Z" fill="#c8c8d8" stroke="#e8e8f0" stroke-width="0.5"/><path d="M9 12L11 14L15 10" stroke="#0d0d1a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';}


// ============================================================
// LANDING 3D INTERACTIONS
// ============================================================

// Mouse parallax sur l'orbite
(function(){
  const orbit = document.getElementById('hero-orbit');
  const hero = document.querySelector('.landing-hero');
  if(!orbit || !hero) return;
  hero.addEventListener('mousemove', e => {
    const rect = hero.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = (e.clientX - rect.left - cx) / cx;
    const dy = (e.clientY - rect.top - cy) / cy;
    orbit.style.transform = `translateX(-50%) rotateX(${-dy * 8}deg) rotateY(${dx * 8}deg)`;
  });
  hero.addEventListener('mouseleave', () => {
    orbit.style.transform = 'translateX(-50%)';
    orbit.style.transition = 'transform .6s ease-out';
  });
  hero.addEventListener('mouseenter', () => {
    orbit.style.transition = 'transform .1s ease-out';
  });
})();

// Tilt 3D feature cards
document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = (e.clientX - rect.left - cx) / cx;
    const dy = (e.clientY - rect.top - cy) / cy;
    const rx = -dy * 8;
    const ry = dx * 8;
    card.style.setProperty('--rx', rx + 'deg');
    card.style.setProperty('--ry', ry + 'deg');
    card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100) + '%');
    card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100) + '%');
  });
  card.addEventListener('mouseleave', () => {
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  });
});

// Scroll reveal
(function(){
  const els = document.querySelectorAll('.reveal-up,.reveal-left,.reveal-right,.reveal');
  if(!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){
        e.target.classList.add('visible','in-view');
        io.unobserve(e.target);
      }
    });
  }, {threshold: 0.12});
  els.forEach(el => io.observe(el));
})();

// Compteur animé
(function(){
  function animateCounter(el, target, duration){
    const start = performance.now();
    const update = now => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(ease * target).toLocaleString('fr-FR');
      if(p < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){
        const target = parseInt(e.target.dataset.target || '0');
        animateCounter(e.target, target, 1800);
        io.unobserve(e.target);
      }
    });
  }, {threshold: 0.5});
  document.querySelectorAll('.stat-counter').forEach(el => io.observe(el));
})();

// ============================================================
// NAVIGATION
function navigate(section) {
  document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + section)?.classList.add('active');
  document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
  currentSection = section;
  if (section === 'admin') loadAdminData();
  if (section === 'messages') { loadMessages(); loadDmList(); }
  if (section === 'profile') updateProfileSection();
  if (section === 'home') { loadFeed(); loadSidebarLeaderboard(); loadActiveAnnouncementBanner(); }
  if (section === 'ranking') loadRanking();
  if (section === 'discover') loadDiscover();
  if (section === 'recruit') loadJobs();
  if (section === 'editor') { loadEditorFiles(); checkAiKeyBanner(); }
  if (section === 'learn') { loadLearnProgress(); renderChallenges(); }
  if (section === 'snippets') { loadSnippets(); }
}

// CLASSEMENT RÉEL
let rankingPeriod='week';
function setRankingPeriod(el,p){
  document.querySelectorAll('#section-ranking .filter-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');rankingPeriod=p;loadRanking();
}

async function loadRanking() {
  const cont = document.getElementById('ranking-rows');
  cont.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;font-family:var(--font-mono)">Chargement...</div>';
  const specLabels = { web_dev: 'web dev', mobile_dev: 'mobile', backend_dev: 'backend', fullstack_dev: 'fullstack', cybersecurity: 'cybersecurity', devops: 'devops', data: 'data', ai_ml: 'ia / ml', designer_ux: 'design', recruiter: 'recruteur' };
  const medals = ['gold', 'silver', 'bronze'];
  let rows=[];

  if(rankingPeriod==='global'){
    const{data}=await db.from('profiles').select('username,avatar_url,specialty,xp,is_premium,premium_tier').eq('is_banned',false).order('xp',{ascending:false}).limit(20);
    rows=(data||[]).map(u=>({username:u.username,avatar_url:u.avatar_url,specialty:u.specialty,is_premium:u.is_premium,premium_tier:u.premium_tier,score:u.xp||0}));
  }else{
    const since=new Date();
    since.setDate(since.getDate()-(rankingPeriod==='week'?7:30));
    const{data:logs}=await db.from('xp_logs').select('user_id,amount').gte('created_at',since.toISOString());
    if(!logs||logs.length===0){cont.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Aucune activité sur cette période.</div>';return;}
    const totals={};
    logs.forEach(l=>{totals[l.user_id]=(totals[l.user_id]||0)+l.amount;});
    const ids=Object.keys(totals);
    const{data:profs}=await db.from('profiles').select('id,username,avatar_url,specialty,is_premium,premium_tier').in('id',ids).eq('is_banned',false);
    rows=(profs||[]).map(u=>({username:u.username,avatar_url:u.avatar_url,specialty:u.specialty,is_premium:u.is_premium,premium_tier:u.premium_tier,score:totals[u.id]||0}))
      .sort((a,b)=>b.score-a.score).slice(0,20);
  }

  if (rows.length === 0) {
    cont.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Aucun membre pour l\'instant.</div>';
    return;
  }
  cont.innerHTML = rows.map((u, i) => {
    const name = u.username || 'Inconnu';
    const init = name.substring(0, 2).toUpperCase();
    const avatarH = u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : init;
    const rankClass = medals[i] ? `rank-num ${medals[i]}` : 'rank-num';
    const prem = u.premium_tier === 'devconnect-plus' ? '<span class="premium-badge devconnectplus">DevConnect+</span>' : u.is_premium ? '<span class="premium-badge devplus">Dev+</span>' : '';
    return `<div class="ranking-row">
      <div class="${rankClass}">${i + 1}</div>
      <div class="rank-user" style="cursor:pointer" onclick="openProfile('${esc(name)}')">
        <div class="rank-avatar">${avatarH}</div>
        <div>
          <div class="rank-name">${esc(name)} ${prem}</div>
          <div class="rank-spec">${esc(specLabels[u.specialty] || u.specialty || '—')}</div>
        </div>
      </div>
      <div class="rank-score">
        <div class="rank-xp">${(u.score || 0).toLocaleString('fr-FR')} XP</div>
      </div>
    </div>`;
  }).join('');
}

// SIDEBAR TOP 5
async function loadSidebarLeaderboard() {
  const cont = document.getElementById('sidebar-leaderboard');
  const { data } = await db.from('profiles').select('username,avatar_url,specialty,xp').eq('is_banned', false).order('xp', { ascending: false }).limit(5);
  if (!data || data.length === 0) { cont.innerHTML = '<div style="font-size:12px;color:var(--text-muted)">Aucun membre.</div>'; return; }
  const specLabels = { web_dev: 'web dev', mobile_dev: 'mobile', backend_dev: 'backend', fullstack_dev: 'fullstack', cybersecurity: 'cybersec', devops: 'devops', data: 'data', ai_ml: 'ia/ml', designer_ux: 'design', recruiter: 'recruteur' };
  cont.innerHTML = data.map((u, i) => {
    const name = u.username || 'Inconnu';
    const init = name.substring(0, 2).toUpperCase();
    const avatarH = u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : init;
    const xpStr = (u.xp || 0) >= 1000 ? `${((u.xp || 0) / 1000).toFixed(1)}k xp` : `${u.xp || 0} xp`;
    return `<div class="leaderboard-item" style="cursor:pointer" onclick="openProfile('${esc(name)}')">
      <div class="lb-rank">${i + 1}</div>
      <div class="lb-avatar">${avatarH}</div>
      <div class="lb-info"><div class="lb-name">${esc(name)}</div><div class="lb-specialty">${esc(specLabels[u.specialty] || '—')}</div></div>
      <div class="lb-xp">${xpStr}</div>
    </div>`;
  }).join('');
}

// UTILITAIRE : temps relatif
function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 172800) return 'hier';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}



// ============================================================
// PROFIL TABS
// ============================================================
const ALL_BADGES = [
  {id:'founder',icon:'◈',name:'Fondateur',desc:'Membre originel',color:'#c8a86a',border:'#9a8a5a'},
  {id:'early',icon:'⚡',name:'Early Adopter',desc:'Parmi les 100 premiers',color:'#8ac8d8',border:'#5a8a9a'},
  {id:'certified',icon:'✦',name:'Certifié',desc:'Certifié par un admin',color:'#c8c8d8',border:'#9a9ab8'},
  {id:'streak',icon:'🔥',name:'Streak Master',desc:'30 jours consécutifs',color:'#c8886a',border:'#9a5a3a'},
  {id:'warrior',icon:'💻',name:'Code Warrior',desc:'500 XP accumulés',color:'#8ac8a8',border:'#5a9a6a'},
  {id:'challenger',icon:'🎯',name:'Challenge King',desc:'10 challenges complétés',color:'#c8a8d8',border:'#8a6a9a'},
  {id:'contributor',icon:'🌟',name:'Top Contributeur',desc:'Top 10 du classement',color:'#c8c86a',border:'#9a9a3a'},
  {id:'security',icon:'🛡️',name:'Security Expert',desc:'5 challenges cybersec',color:'#8ab8c8',border:'#5a8898'},
  {id:'deployer',icon:'🚀',name:'First Deploy',desc:'Premier projet publié',color:'#c8a86a',border:'#9a783a'},
  {id:'social',icon:'👥',name:'Social',desc:'50 messages envoyés',color:'#c8888a',border:'#9a5a5a'},
  {id:'mentor',icon:'🎓',name:'Mentor',desc:'A aidé 10 membres',color:'#88c8a8',border:'#5a9a78'},
  {id:'vip',icon:'⭐',name:'VIP',desc:'Membre premium 30j',color:'#c8b86a',border:'#9a8a3a'},
  {id:'networker',icon:'🤝',name:'Networker',desc:'Suit 20 personnes',color:'#a8c8d8',border:'#7898a8'},
  {id:'writer',icon:'📝',name:'Rédacteur',desc:'20 posts publiés',color:'#c8a8b8',border:'#9a7888'},
  {id:'top10',icon:'🏅',name:'Top 10',desc:'Top 10 du classement global',color:'#d8c868',border:'#a89838'},
  {id:'recruiter',icon:'🌍',name:'Recruteur actif',desc:'3 offres publiées',color:'#88b8c8',border:'#5888a0'},
];

function getBadgesForProfile(p) {
  const unlocked = [];
  if(p.xp >= 1) unlocked.push('founder');
  if(p.is_certified) unlocked.push('certified');
  if(p.is_premium) unlocked.push('vip');
  if(p.xp >= 500) unlocked.push('warrior');
  if(p.xp >= 1000) unlocked.push('contributor');
  if(p.streak >= 30) unlocked.push('streak');
  return unlocked;
}

function renderBadgesTab(p) {
  const unlocked = getBadgesForProfile(p);
  const cont = document.getElementById('badges-list');
  if(!cont) return;
  // Badge rôle en premier
  const roleLabel = ROLE_LABELS[p.role] || p.role || '';
  let html = '';
  if(roleLabel) {
    html += `<div class="badge-card unlocked">
      <div class="badge-icon">⬡</div>
      <div class="badge-name">${esc(roleLabel)}</div>
      <div class="badge-desc">Rôle DevConnect</div>
    </div>`;
  }
  ALL_BADGES.forEach(b => {
    const isUnlocked = unlocked.includes(b.id);
    html += `<div class="badge-card ${isUnlocked?'unlocked':'locked'}" title="${esc(b.desc)}">
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-name">${esc(b.name)}</div>
      <div class="badge-desc">${esc(b.desc)}</div>
    </div>`;
  });
  cont.innerHTML = html;
}

function renderMarkdown(text){
  if(!text)return '';
  try{ return marked.parse(esc(text)); }catch(e){ return esc(text); }
}

function parseGithubUrl(url){
  if(!url)return null;
  const m=url.match(/github\.com\/([^\/\s]+)\/([^\/\s#?]+?)(?:\.git)?\/?(?:[#?].*)?$/i);
  return m?{owner:m[1],repo:m[2]}:null;
}

async function fetchGithubStats(owner,repo){
  const key=`gh_stats_${owner}_${repo}`;
  try{
    const cached=JSON.parse(localStorage.getItem(key)||'null');
    if(cached&&Date.now()-cached.ts<3600000)return cached.data;
  }catch(e){}
  try{
    const res=await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if(!res.ok)return null;
    const d=await res.json();
    const stats={stars:d.stargazers_count||0,forks:d.forks_count||0,lang:d.language||'',pushed_at:d.pushed_at};
    localStorage.setItem(key,JSON.stringify({ts:Date.now(),data:stats}));
    return stats;
  }catch(e){return null;}
}

async function renderProjectsTab() {
  const cont = document.getElementById('projects-list');
  if(!cont || !currentUser) return;
  const {data} = await db.from('projects').select('*').eq('user_id', currentUser.id).order('created_at', {ascending:false});
  if(!data || data.length === 0) {
    cont.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Aucun projet ajouté. Clique sur + pour commencer !</div>';
    return;
  }
  cont.innerHTML = data.map(p => `<div class="project-card" data-project-id="${esc(p.id)}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
      <div class="project-name">${esc(p.name||'')} ${p.looking_for_collab?'<span class="badge-inline" style="margin-left:6px">🤝 Cherche collaborateurs</span>':''}</div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        ${p.github_url?`<a href="${esc(p.github_url)}" target="_blank" class="btn btn-ghost btn-sm">GitHub</a>`:''}
        <button class="btn btn-ghost btn-sm" onclick="editProject('${esc(p.id)}')">Modifier</button>
        <button class="btn btn-ghost btn-sm" style="color:#e08080" onclick="deleteProject('${esc(p.id)}')">Suppr.</button>
      </div>
    </div>
    <div class="project-desc markdown-body">${renderMarkdown(p.description)}</div>
    ${p.stack&&p.stack.length?`<div class="project-stack">${p.stack.map(s=>`<span class="stack-tag">${esc(s)}</span>`).join('')}</div>`:''}
    <div class="project-gh-stats" id="gh-stats-${esc(p.id)}" style="font-size:11px;color:var(--text-muted);margin-top:8px;font-family:var(--font-mono)"></div>
  </div>`).join('');
  cont.querySelectorAll('pre code').forEach(b=>{try{hljs.highlightElement(b);}catch(e){}});
  data.forEach(async p=>{
    if(!p.github_url)return;
    const parsed=parseGithubUrl(p.github_url);
    if(!parsed)return;
    const stats=await fetchGithubStats(parsed.owner,parsed.repo);
    const el=document.getElementById(`gh-stats-${p.id}`);
    if(el&&stats)el.innerHTML=`★ ${stats.stars} · ⑂ ${stats.forks}${stats.lang?' · '+esc(stats.lang):''} · maj ${timeAgo(stats.pushed_at)}`;
  });
}

let editingProjectId=null;
function openAddProjectModal(){
  editingProjectId=null;
  setEl('project-modal-title','Ajouter un projet');
  setVal('proj-name','');setVal('proj-desc','');setVal('proj-github','');setVal('proj-stack','');
  document.getElementById('proj-collab').classList.remove('on');
  document.getElementById('project-modal').classList.add('show');
}
function closeProjectModal(){document.getElementById('project-modal').classList.remove('show');}

async function editProject(id){
  const {data:p,error}=await db.from('projects').select('*').eq('id',id).maybeSingle();
  if(error||!p){showToast('Projet introuvable.','error');return;}
  editingProjectId=id;
  setEl('project-modal-title','Modifier le projet');
  setVal('proj-name',p.name||'');setVal('proj-desc',p.description||'');setVal('proj-github',p.github_url||'');
  setVal('proj-stack',(p.stack||[]).join(', '));
  document.getElementById('proj-collab').classList.toggle('on',!!p.looking_for_collab);
  document.getElementById('project-modal').classList.add('show');
}

async function saveProject(){
  if(!currentUser)return;
  const name=getVal('proj-name').trim();
  const description=getVal('proj-desc').trim();
  const github_url=getVal('proj-github').trim();
  const stack=getVal('proj-stack').split(',').map(s=>s.trim()).filter(Boolean);
  const looking_for_collab=document.getElementById('proj-collab').classList.contains('on');
  if(!name){showToast('Le nom du projet est obligatoire.','error');return;}
  const payload={name,description,github_url:github_url||null,stack,looking_for_collab};
  let error;
  if(editingProjectId){
    ({error}=await db.from('projects').update(payload).eq('id',editingProjectId));
  }else{
    payload.user_id=currentUser.id;
    ({error}=await db.from('projects').insert(payload));
  }
  if(error){showToast('Erreur : '+error.message,'error');return;}
  closeProjectModal();
  showToast(editingProjectId?'Projet mis à jour !':'Projet publié !','success');
  await renderProjectsTab();
}

async function deleteProject(id){
  if(!confirm('Supprimer ce projet ?'))return;
  const {error}=await db.from('projects').delete().eq('id',id);
  if(error){showToast('Erreur : '+error.message,'error');return;}
  showToast('Projet supprimé.','success');
  await renderProjectsTab();
}

async function expressProjectInterest(projectId,ownerId,projectName){
  if(!currentUser){showToast('Connecte-toi pour manifester ton intérêt.','error');return;}
  if(ownerId===currentUser.id){showToast('C\'est ton propre projet !','error');return;}
  await notifyUser(ownerId,'project_interest',`@${currentProfile.username} est intéressé(e) par collaborer sur "${projectName}".`,'discover');
  showToast('Ton intérêt a été envoyé au créateur du projet !','success');
}

// ============================================================
// SNIPPETS LIBRARY
// ============================================================
let activeSnippetLang='all';

function openAddSnippetModal(){
  if(!currentUser){showToast('Connecte-toi pour publier un snippet.','error');return;}
  setVal('snip-title','');setVal('snip-code','');setVal('snip-desc','');setVal('snip-tags','');
  setVal('snip-lang','javascript');
  document.getElementById('snippet-modal').classList.add('show');
}
function closeSnippetModal(){document.getElementById('snippet-modal').classList.remove('show');}

async function saveSnippet(){
  if(!currentUser)return;
  const title=getVal('snip-title').trim();
  const code=getVal('snip-code').trim();
  const language=getVal('snip-lang');
  const description=getVal('snip-desc').trim();
  const tags=getVal('snip-tags').split(',').map(t=>t.trim()).filter(Boolean);
  if(!title||!code){showToast('Titre et code sont obligatoires.','error');return;}
  const{error}=await db.from('snippets').insert({user_id:currentUser.id,title,code,language,description,tags,likes_count:0});
  if(error){showToast('Erreur : '+error.message,'error');return;}
  closeSnippetModal();
  showToast('Snippet publié !','success');
  await loadSnippets();
}

function setSnippetLangFilter(el,lang){
  document.querySelectorAll('#snippet-lang-filters .filter-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  activeSnippetLang=lang;
  loadSnippets();
}

async function loadSnippets(){
  const cont=document.getElementById('snippets-list');
  if(!cont)return;
  cont.innerHTML='<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;font-family:var(--font-mono)">Chargement...</div>';
  let q=db.from('snippets').select('*,profiles(username,avatar_url)').order('created_at',{ascending:false}).limit(50);
  if(activeSnippetLang!=='all')q=q.eq('language',activeSnippetLang);
  const{data,error}=await q;
  if(error||!data||data.length===0){
    cont.innerHTML='<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;font-family:var(--font-mono)">Aucun snippet pour l\'instant. Sois le premier à en publier !</div>';
    return;
  }
  let myLikes=new Set();
  if(currentUser){
    const{data:lk}=await db.from('snippet_likes').select('snippet_id').eq('user_id',currentUser.id);
    if(lk)lk.forEach(l=>myLikes.add(l.snippet_id));
  }
  const langLabels={javascript:'JavaScript',python:'Python',css:'CSS',html:'HTML',sql:'SQL',other:'Autre'};
  cont.innerHTML=data.map(s=>{
    const prof=s.profiles||{};
    const name=prof.username||'Inconnu';
    const liked=myLikes.has(s.id);
    const codeEscaped=esc(s.code||'');
    const avatarHtml=prof.avatar_url?`<img src="${esc(prof.avatar_url)}" alt="">`:`<span>${esc(name.charAt(0).toUpperCase())}</span>`;
    const langLabel=langLabels[s.language]||s.language||'Code';
    return`<div class="snippet-card">
      <div class="snippet-card-header">
        <div class="snippet-card-avatar">${avatarHtml}</div>
        <div class="snippet-card-meta">
          <div class="snippet-card-title">${esc(s.title||'')}</div>
          <div class="snippet-card-by">par <span style="cursor:pointer;color:var(--accent-dim)" onclick="openProfile('${esc(name)}')">@${esc(name)}</span> · ${timeAgo(s.created_at)}</div>
        </div>
        <span class="snippet-lang-badge">${esc(langLabel)}</span>
      </div>
      ${s.description?`<div class="snippet-card-desc">${esc(s.description)}</div>`:''}
      <div class="snippet-code-block">
        <div class="snippet-code-bar">
          <span>${esc(s.language||'code')}</span>
          <button class="snippet-copy-btn" onclick="copySnippetCode(this)" data-code="${esc(s.code||'')}">⧉ Copier</button>
        </div>
        <pre><code class="language-${esc(s.language||'')}">${codeEscaped}</code></pre>
      </div>
      ${s.tags&&s.tags.length?`<div class="project-stack" style="margin-top:10px">${s.tags.map(t=>`<span class="stack-tag">${esc(t)}</span>`).join('')}</div>`:''}
      <div class="snippet-card-actions">
        <button class="post-action ${liked?'post-liked':''}" onclick="toggleSnippetLike('${esc(s.id)}',this)">◆ <span class="like-count">${s.likes_count||0}</span></button>
        <button class="post-action" onclick="toggleSnippetComments('${esc(s.id)}')">💬 Code review</button>
      </div>
      <div class="snippet-comments" id="snip-comments-${esc(s.id)}" style="display:none;margin-top:10px;border-top:1px solid var(--border);padding-top:10px"></div>
    </div>`;
  }).join('');
  cont.querySelectorAll('pre code').forEach(b=>{try{hljs.highlightElement(b);}catch(e){}});
}

async function toggleSnippetComments(snippetId){
  const el=document.getElementById('snip-comments-'+snippetId);
  if(!el)return;
  const isHidden=el.style.display==='none';
  el.style.display=isHidden?'block':'none';
  if(isHidden)await loadSnippetComments(snippetId);
}

async function loadSnippetComments(snippetId){
  const el=document.getElementById('snip-comments-'+snippetId);
  if(!el)return;
  el.innerHTML='<div style="font-size:12px;color:var(--text-muted)">Chargement...</div>';
  const{data,error}=await db.from('snippet_comments').select('*,profiles(username)').eq('snippet_id',snippetId).order('created_at',{ascending:true}).limit(50);
  const list=(!error&&data)?data.map(c=>{
    const name=c.profiles?.username||'Inconnu';
    return`<div style="margin-bottom:8px;font-size:12px"><span style="cursor:pointer;font-weight:500;color:var(--text)" onclick="openProfile('${esc(name)}')">@${esc(name)}</span> <span style="color:var(--text-muted);font-size:10px">${timeAgo(c.created_at)}</span><div style="color:var(--text-secondary);margin-top:2px">${esc(c.content)}</div></div>`;
  }).join(''):'';
  el.innerHTML=(list||'<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Aucun commentaire. Sois le premier à proposer une revue !</div>')+
    (currentUser?`<div style="display:flex;gap:6px;margin-top:8px"><input type="text" class="form-input" id="snip-comment-input-${esc(snippetId)}" placeholder="Propose une amélioration, signale un bug..." style="font-size:12px" onkeydown="if(event.key==='Enter')submitSnippetComment('${esc(snippetId)}')"><button class="btn btn-primary btn-sm" onclick="submitSnippetComment('${esc(snippetId)}')">Envoyer</button></div>`:'');
}

async function submitSnippetComment(snippetId){
  if(!currentUser){showToast('Connecte-toi pour commenter.','error');return;}
  const input=document.getElementById('snip-comment-input-'+snippetId);
  const content=input.value.trim();
  if(!content)return;
  const{error}=await db.from('snippet_comments').insert({snippet_id:snippetId,user_id:currentUser.id,content});
  if(error){showToast('Erreur : '+error.message,'error');return;}
  input.value='';
  await loadSnippetComments(snippetId);
}

async function toggleSnippetLike(snippetId,btn){
  if(!currentUser){showToast('Connecte-toi pour liker.','error');return;}
  const liked=btn.classList.contains('post-liked');
  const countEl=btn.querySelector('.like-count');
  if(liked){
    btn.classList.remove('post-liked');
    countEl.textContent=Math.max(0,parseInt(countEl.textContent)-1);
    await db.from('snippet_likes').delete().eq('snippet_id',snippetId).eq('user_id',currentUser.id);
    await db.rpc('decrement_snippet_likes',{snippet_id_input:snippetId}).catch(()=>{});
  }else{
    btn.classList.add('post-liked');
    countEl.textContent=parseInt(countEl.textContent)+1;
    await db.from('snippet_likes').insert({snippet_id:snippetId,user_id:currentUser.id});
    await db.rpc('increment_snippet_likes',{snippet_id_input:snippetId}).catch(()=>{});
  }
}

function copySnippetCode(btn){
  const code=btn.dataset.code||'';
  navigator.clipboard.writeText(code).then(()=>{
    showToast('Code copié dans le presse-papier !','success');
  }).catch(()=>{showToast('Impossible de copier.','error');});
}

async function renderStatsTab() {
  if(!currentUser || !currentProfile) return;
  setEl('stats-xp', currentProfile.xp || 0);
  setEl('stats-streak', (currentProfile.streak || 0) + ' jours');
  const {count: challengeCount} = await db.from('challenge_completions').select('*',{count:'exact',head:true}).eq('user_id', currentUser.id);
  setEl('stats-challenges', challengeCount || 0);
  const {count: postCount} = await db.from('posts').select('*',{count:'exact',head:true}).eq('user_id', currentUser.id);
  setEl('stats-posts', postCount || 0);
  const heatEl=document.getElementById('stats-github-heatmap');
  if(heatEl)heatEl.innerHTML=githubHeatmapHtml(currentProfile.github_url);
}

function switchProfileTab(tab, el) {
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.profile-tab-content').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-'+tab)?.classList.add('active');
  if(tab === 'badges') renderBadgesTab(currentProfile || {});
  if(tab === 'projects') renderProjectsTab();
  if(tab === 'stats') renderStatsTab();
}

// ============================================================
// APERÇU LIVE PROFIL
// ============================================================
function updateLivePreview() {
  const name = getVal('s-displayname') || currentProfile?.display_name || getVal('s-username') || currentProfile?.username || '—';
  const bio = getVal('s-bio') || 'Aucune bio renseignée.';
  const pronouns = getVal('s-pronouns') || '';
  setEl('preview-name', name);
  setEl('preview-handle', '@' + name.toLowerCase().replace(/\s/g,''));
  setEl('preview-bio', bio);
  const pron = document.getElementById('preview-pronouns');
  if(pron) { pron.textContent = pronouns; pron.style.display = pronouns ? 'block' : 'none'; }
}

// ============================================================
// GRADIENT BANNIÈRE
// ============================================================
function updateGradientPreview() {
  const c1 = getVal('grad-color-1') || '#0e0e1a';
  const c2 = getVal('grad-color-2') || '#1a1a3a';
  const c3 = getVal('grad-color-3') || '#2a1a3a';
  const bar = document.getElementById('gradient-preview-bar');
  if(bar) bar.style.background = `linear-gradient(135deg, ${c1}, ${c2}, ${c3})`;
}

async function saveBannerGradient() {
  if(!isDevPlus()) { showToast('Réservé aux membres Dev+.', 'error'); return; }
  const c1 = getVal('grad-color-1');
  const c2 = getVal('grad-color-2');
  const c3 = getVal('grad-color-3');
  const gradient = `linear-gradient(135deg, ${c1}, ${c2}, ${c3})`;
  const {error} = await db.from('profiles').update({banner_gradient: gradient, banner_url: null}).eq('id', currentUser.id);
  if(error) { showToast('Erreur : ' + error.message, 'error'); return; }
  await loadProfile();
  showToast('Dégradé appliqué !', 'success');
}

async function saveSiteGradient() {
  if(!isDevConnectPlus()){showToast('Réservé aux membres DevConnect+.','error');return;}
  const c1=getVal('grad-color-1')||'#0a0a12';
  const c2=getVal('grad-color-2')||'#0d0d1e';
  const c3=getVal('grad-color-3')||'#12101e';
  localStorage.setItem('dc_site_gradient',JSON.stringify([c1,c2,c3]));
  applySiteGradient(c1,c2,c3);
  showToast('Fond du site mis à jour !','success');
}

function applySiteGradient(c1,c2,c3){
  document.getElementById('page-app').style.background=`linear-gradient(135deg,${c1},${c2},${c3})`;
}

async function clearSiteGradient(){
  localStorage.removeItem('dc_site_gradient');
  document.getElementById('page-app').style.background='';
  showToast('Fond réinitialisé.','success');
}

async function uploadBannerGif(input){
  if(!isDevConnectPlus()){showToast('Réservé aux membres DevConnect+.','error');return;}
  const file=input.files[0];if(!file)return;
  if(file.type!=='image/gif'){showToast('Seuls les GIFs sont acceptés ici.','error');return;}
  if(file.size>5*1024*1024){showToast('GIF trop lourd (5 Mo max).','error');return;}
  showToast('Upload en cours...','info');
  const url=await uploadToBucket('banners',file);if(!url)return;
  const{error}=await db.from('profiles').update({banner_url:url,banner_gradient:null}).eq('id',currentUser.id);
  if(error){showToast('Erreur : '+error.message,'error');return;}
  await loadProfile();showToast('Bannière GIF mise à jour !','success');
}

async function clearBannerGradient() {
  if(!currentUser) return;
  await db.from('profiles').update({banner_gradient: null}).eq('id', currentUser.id);
  await loadProfile();
  showToast('Dégradé retiré.', 'success');
}

async function removeBanner() {
  if(!currentUser) return;
  await db.from('profiles').update({banner_url: null, banner_gradient: null}).eq('id', currentUser.id);
  await loadProfile();
  showToast('Bannière supprimée.', 'success');
}

async function removeAvatar() {
  if(!currentUser) return;
  await db.from('profiles').update({avatar_url: null}).eq('id', currentUser.id);
  await loadProfile();
  showToast('Avatar supprimé.', 'success');
}

// ============================================================
// THÈME CLAIR / SOMBRE
// ============================================================
function setTheme(theme) {
  document.documentElement.classList.toggle('light', theme === 'light');
  localStorage.setItem('dc_theme', theme);
  document.getElementById('btn-theme-dark').style.borderColor = theme === 'dark' ? 'var(--border-light)' : 'var(--border)';
  document.getElementById('btn-theme-light').style.borderColor = theme === 'light' ? 'var(--border-light)' : 'var(--border)';
}

function initTheme() {
  const t = localStorage.getItem('dc_theme') || 'dark';
  setTheme(t);
}

function initLandingFx(){
  // Nav devient opaque au scroll
  const nav=document.querySelector('.landing-nav');
  const onScroll=()=>{if(nav)nav.classList.toggle('scrolled',window.scrollY>24);};
  window.addEventListener('scroll',onScroll,{passive:true});
  onScroll();

  // Reveal au scroll pour les sections/cartes
  const revealTargets=document.querySelectorAll('.landing-section,.feature-card,.ref-card,.privacy-block,.cta-box');
  revealTargets.forEach(el=>el.classList.add('reveal'));
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-view');io.unobserve(e.target);}});
    },{threshold:.12});
    revealTargets.forEach(el=>io.observe(el));
  } else {
    revealTargets.forEach(el=>el.classList.add('in-view'));
  }

  // Tilt de l'anneau "orbite" au mouvement de souris (effet bezel de montre)
  const orbit=document.getElementById('hero-orbit');
  const hero=document.querySelector('.landing-hero');
  if(orbit&&hero&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    hero.addEventListener('mousemove',e=>{
      const r=hero.getBoundingClientRect();
      const px=(e.clientX-r.left)/r.width-0.5;
      const py=(e.clientY-r.top)/r.height-0.5;
      orbit.style.transform=`translateX(-50%) rotateX(${py*-10}deg) rotateY(${px*14}deg)`;
    });
    hero.addEventListener('mouseleave',()=>{orbit.style.transform='translateX(-50%)';});
  }
}


// ============================================================
// SYSTÈME DM RÉEL
// ============================================================

// Charger la liste des conversations DM
async function loadDmList(){
  if(!currentUser)return;
  const cont=document.getElementById('dm-list');
  if(!cont)return;
  const{data:convs1,error:e1}=await db.from('dm_conversations').select('id,user2_id').eq('user1_id',currentUser.id);
  const{data:convs2,error:e2}=await db.from('dm_conversations').select('id,user1_id').eq('user2_id',currentUser.id);
  if(e1)console.error('Erreur DM list (1):',e1);
  if(e2)console.error('Erreur DM list (2):',e2);
  const all=[];
  (convs1||[]).forEach(c=>all.push({id:c.id,otherId:c.user2_id}));
  (convs2||[]).forEach(c=>all.push({id:c.id,otherId:c.user1_id}));
  if(all.length===0){cont.innerHTML='<div style="font-size:12px;color:var(--text-muted);padding:4px 10px">Aucune conversation.</div>';return;}
  const otherIds=[...new Set(all.map(c=>c.otherId))];
  const{data:profs,error:e3}=await db.from('profiles').select('id,username,avatar_url').in('id',otherIds);
  if(e3)console.error('Erreur DM list profils:',e3);
  const pmap={};(profs||[]).forEach(p=>pmap[p.id]=p);
  cont.innerHTML=all.map(c=>{
    const u=pmap[c.otherId]||{};
    const name=u.username||'Inconnu';
    const init=name.substring(0,2).toUpperCase();
    const avatarH=u.avatar_url?`<img src="${esc(u.avatar_url)}" alt="avatar">`:`${init}`;
    return`<div class="dm-item ${currentDmConvId===c.id?'active':''}" onclick="openDmConv('${c.id}','${esc(name)}')">
      <div class="dm-avatar">${avatarH}</div>
      <span>${esc(name)}</span>
    </div>`;
  }).join('');
}

// Ouvrir une conversation DM existante
async function openDmConv(convId, username){
  currentDmConvId=convId;
  currentDmUser=username;
  isDmMode=true;
  unsubscribeChannelRealtime();
  // Update UI
  document.querySelectorAll('.dm-item').forEach(d=>d.classList.remove('active'));
  event?.currentTarget?.classList.add('active');
  document.querySelectorAll('.channel-item').forEach(c=>c.classList.remove('active'));
  // Header
  document.getElementById('current-channel-name').textContent=username;
  document.querySelector('.chat-header-desc').textContent='Message direct privé';
  document.querySelector('.channel-hash').textContent='@';
  document.getElementById('chat-input').placeholder=`Message à @${username}...`;
  // Charger messages DM
  await loadDmMessages();
  // Realtime
  if(dmRealtimeSub)db.removeChannel(dmRealtimeSub);
  dmRealtimeSub=db.channel('dm-'+convId)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`dm_conversation_id=eq.${convId}`},()=>loadDmMessages())
    .subscribe();
}

// Charger les messages d'une conv DM
async function loadDmMessages(){
  if(!currentDmConvId)return;
  const c=document.getElementById('chat-messages');
  const{data:msgs,error:msgErr}=await db.from('messages')
    .select('id,user_id,content,created_at')
    .eq('dm_conversation_id',currentDmConvId)
    .eq('is_dm',true)
    .order('created_at',{ascending:true})
    .limit(50);
  if(msgErr){
    console.error('Erreur chargement DM:',msgErr);
    c.innerHTML=`<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Erreur de chargement : ${esc(msgErr.message)}</div>`;
    return;
  }
  if(!msgs||msgs.length===0){
    c.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Début de la conversation. Dis bonjour ! 👋</div>';
    return;
  }
  const userIds=[...new Set(msgs.map(m=>m.user_id))];
  const{data:profs,error:profErr}=await db.from('profiles').select('id,username,avatar_url,is_premium,premium_tier,is_certified').in('id',userIds);
  if(profErr)console.error('Erreur chargement profils (DM):',profErr);
  const pmap={};(profs||[]).forEach(p=>pmap[p.id]=p);
  c.innerHTML=msgs.map(m=>{
    const prof=pmap[m.user_id]||{};
    const name=prof.username||'Inconnu';
    const init=name.substring(0,2).toUpperCase();
    const avatarH=prof.avatar_url?`<img src="${esc(prof.avatar_url)}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:init;
    const prem=prof.premium_tier==='devconnect-plus'?'<span class="premium-badge devconnectplus">DevConnect+</span>':prof.is_premium?'<span class="premium-badge devplus">Dev+</span>':'';
    const certif=prof.is_certified?certifBadge():'';
    const time=new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
    const isMe=m.user_id===currentUser?.id;
    return`<div class="chat-msg" style="${isMe?'flex-direction:row-reverse;text-align:right':''}">
      <div class="chat-msg-avatar" style="cursor:pointer" onclick="openProfile('${esc(name)}')">${avatarH}</div>
      <div class="chat-msg-body">
        <div class="chat-msg-header"><span class="chat-msg-name" style="cursor:pointer" onclick="openProfile('${esc(name)}')">${esc(name)}</span>${certif}${prem}<span class="chat-msg-time">${time}</span></div>
        <div class="chat-msg-content">${esc(m.content)}</div>
      </div>
    </div>`;
  }).join('');
  c.scrollTop=c.scrollHeight;
}

// Ouvrir modal nouveau DM
function openNewDmModal(){
  document.getElementById('new-dm-modal').classList.add('show');
  setTimeout(()=>document.getElementById('dm-search-input').focus(),50);
}
function closeNewDmModal(){
  document.getElementById('new-dm-modal').classList.remove('show');
  document.getElementById('dm-search-input').value='';
  document.getElementById('dm-search-results').innerHTML='';
}

// Chercher un user pour ouvrir un DM
async function searchDmUsers(q){
  const cont=document.getElementById('dm-search-results');
  if(!q||q.length<2){cont.innerHTML='';return;}
  const{data}=await db.from('profiles').select('id,username,avatar_url,specialty').ilike('username',`%${q}%`).eq('is_banned',false).neq('id',currentUser.id).limit(8);
  if(!data||data.length===0){cont.innerHTML='<div style="font-size:13px;color:var(--text-muted);padding:8px">Aucun utilisateur trouvé.</div>';return;}
  const specLabels={web_dev:'Dev Web',mobile_dev:'Mobile',backend_dev:'Backend',fullstack_dev:'Fullstack',cybersecurity:'Cybersec',devops:'DevOps',data:'Data',ai_ml:'IA/ML',designer_ux:'Design',recruiter:'Recruteur'};
  cont.innerHTML=data.map(u=>{
    const init=(u.username||'').substring(0,2).toUpperCase();
    const avatarH=u.avatar_url?`<img src="${esc(u.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:init;
    return`<div class="dm-item" onclick="startDm('${u.id}','${esc(u.username)}')">
      <div class="dm-avatar">${avatarH}</div>
      <div><div style="font-size:13px;font-weight:500">${esc(u.username)}</div><div style="font-size:11px;color:var(--text-muted)">${specLabels[u.specialty]||'—'}</div></div>
    </div>`;
  }).join('');
}

// Démarrer ou rejoindre une conv DM avec un user
async function startDm(targetId, targetUsername){
  if(!currentUser){showToast('Connecte-toi.','error');return;}
  closeNewDmModal();
  // Cherche une conv existante (dans les 2 sens)
  let convId=null;
  const{data:c1}=await db.from('dm_conversations').select('id').eq('user1_id',currentUser.id).eq('user2_id',targetId).maybeSingle();
  const{data:c2}=await db.from('dm_conversations').select('id').eq('user1_id',targetId).eq('user2_id',currentUser.id).maybeSingle();
  if(c1){convId=c1.id;}
  else if(c2){convId=c2.id;}
  else{
    // Créer nouvelle conv
    const{data:newConv,error}=await db.from('dm_conversations').insert({user1_id:currentUser.id,user2_id:targetId}).select().maybeSingle();
    if(error){showToast('Erreur : '+error.message,'error');return;}
    convId=newConv.id;
  }
  navigate('messages');
  await loadDmList();
  await openDmConv(convId,targetUsername);
}

async function requestPairingSession(targetId,targetUsername){
  closeProfileModal();
  await startDm(targetId,targetUsername);
  const input=document.getElementById('chat-input');
  if(input){
    input.value=`Salut ! Je vois que tu es dispo pour du pair programming, ça te dirait qu'on fasse une session ensemble ? 🤝`;
    input.focus();
  }
}

// ============================================================

// MESSAGES
async function loadMessages(){
  const{data:chan,error:chanErr}=await db.from('channels').select('id').eq('name',currentChannel).maybeSingle();
  if(chanErr)console.error('Erreur chargement canal:',chanErr);
  if(!chan){document.getElementById('chat-messages').innerHTML='<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Ce canal n\'existe pas encore en base.</div>';return;}
  subscribeChannelRealtime(chan.id);
  const{data:msgs,error:msgErr}=await db.from('messages').select('id,user_id,content,created_at').eq('channel_id',chan.id).eq('is_dm',false).order('created_at',{ascending:true}).limit(50);
  if(msgErr){console.error('Erreur chargement messages:',msgErr);document.getElementById('chat-messages').innerHTML=`<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Erreur de chargement : ${esc(msgErr.message)}</div>`;return;}
  if(msgs&&msgs.length>0){
    const userIds=[...new Set(msgs.map(m=>m.user_id))];
    const{data:profs,error:profErr}=await db.from('profiles').select('id,username,is_premium,premium_tier,is_certified').in('id',userIds);
    if(profErr)console.error('Erreur chargement profils:',profErr);
    const pmap={};(profs||[]).forEach(p=>pmap[p.id]=p);
    const c=document.getElementById('chat-messages');
    c.innerHTML=msgs.map(m=>{
      const prof=pmap[m.user_id]||{};
      const name=prof.username||'Inconnu';
      const init=name.substring(0,2).toUpperCase();
      const prem=prof.premium_tier==='devconnect-plus'?'<span class="premium-badge devconnectplus">DevConnect+</span>':prof.is_premium?'<span class="premium-badge devplus">Dev+</span>':'';
      const certif=prof.is_certified?certifBadge():'';
      const time=new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
      const reportIcon=(currentUser&&m.user_id!==currentUser.id)?`<span style="cursor:pointer;opacity:.4;font-size:11px;margin-left:6px" title="Signaler" onclick="event.stopPropagation();openReportModal('${esc(m.user_id)}','${esc(name)}')">⚠</span>`:'';
      return`<div class="chat-msg"><div class="chat-msg-avatar" style="cursor:pointer" onclick="openProfile('${esc(name)}')">${init}</div><div class="chat-msg-body"><div class="chat-msg-header"><span class="chat-msg-name" style="cursor:pointer" onclick="openProfile('${esc(name)}')">${esc(name)}</span>${certif}${prem}<span class="chat-msg-time">${time}</span>${reportIcon}</div><div class="chat-msg-content">${esc(m.content)}</div></div></div>`;
    }).join('');
    c.scrollTop=c.scrollHeight;
  }else{
    document.getElementById('chat-messages').innerHTML='<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Aucun message dans ce canal. Sois le premier !</div>';
  }
}

// Realtime sur le salon actif — sans ça, les autres utilisateurs
// ne voient jamais les nouveaux messages sans recharger la page.
let _subscribedChannelId=null;
function subscribeChannelRealtime(channelId){
  if(_subscribedChannelId===channelId&&channelRealtimeSub)return; // déjà abonné à ce salon
  if(channelRealtimeSub){db.removeChannel(channelRealtimeSub);channelRealtimeSub=null;}
  _subscribedChannelId=channelId;
  channelRealtimeSub=db.channel('channel-'+channelId)
    .on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:`channel_id=eq.${channelId}`},()=>{
      if(!isDmMode)loadMessages();
    })
    .subscribe();
}
function unsubscribeChannelRealtime(){
  if(channelRealtimeSub){db.removeChannel(channelRealtimeSub);channelRealtimeSub=null;_subscribedChannelId=null;}
}

async function sendMessage(){
  if(!currentUser){showToast('Connecte-toi pour envoyer un message.','error');return;}
  if(currentProfile?.is_muted){showToast('Tu es muté et ne peux pas envoyer de messages.','error');return;}
  const input=document.getElementById('chat-input');
  const content=input.value.trim();
  if(!content)return;
  if(content.length>2000){showToast('Message trop long (max 2000 caractères).','error');return;}

  if(isDmMode){
    if(!currentDmConvId){showToast('Aucune conversation ouverte.','error');return;}
    const{error}=await db.from('messages').insert({user_id:currentUser.id,dm_conversation_id:currentDmConvId,content,is_dm:true});
    if(error){showToast('Erreur lors de l\'envoi : '+error.message,'error');return;}
    input.value='';
    await loadDmMessages();
    notifyMentions(content,'dm');
    const{data:conv}=await db.from('dm_conversations').select('user1_id,user2_id').eq('id',currentDmConvId).maybeSingle();
    if(conv){
      const otherId=conv.user1_id===currentUser.id?conv.user2_id:conv.user1_id;
      await notifyUser(otherId,'dm',`@${currentProfile.username} t'a envoyé un message.`,'messages');
    }
    return;
  }

  const{data:chan}=await db.from('channels').select('id').eq('name',currentChannel).maybeSingle();
  if(!chan){showToast('Ce canal n\'existe pas en base (à créer côté Supabase).','error');return;}
  const{error}=await db.from('messages').insert({user_id:currentUser.id,channel_id:chan.id,content,is_dm:false});
  if(error){showToast('Erreur lors de l\'envoi : '+error.message,'error');return;}
  input.value='';
  await loadMessages();
  notifyMentions(content,'channel');
}
async function notifyMentions(content,context){
  const usernames=[...new Set((content.match(/@([a-zA-Z0-9_]{2,32})/g)||[]).map(s=>s.slice(1)))];
  if(usernames.length===0)return;
  const{data:mentioned}=await db.from('profiles').select('id,username').in('username',usernames);
  if(!mentioned)return;
  for(const u of mentioned){
    await notifyUser(u.id,'mention',`@${currentProfile.username} t'a mentionné dans ${context==='dm'?'un message direct':'le chat'}.`,'messages');
  }
}

function switchChannel(el,name){
  isDmMode=false;currentDmConvId=null;currentDmUser=null;
  if(dmRealtimeSub){db.removeChannel(dmRealtimeSub);dmRealtimeSub=null;}
  document.querySelector('.channel-hash').textContent='#';
  document.querySelector('.chat-header-desc').textContent='Salon général de discussion';
  document.querySelectorAll('.dm-item').forEach(d=>d.classList.remove('active'));
  document.getElementById('chat-input').placeholder='Message #'+name+'...';
  
  document.querySelectorAll('.channel-item').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');currentChannel=name;
  document.getElementById('current-channel-name').textContent=name;
  loadMessages();
}

// KEYBOARD
const KB={symbols:['←','→','↑','↓','↔','⇒','⇐','•','◆','◇','◈','◉','⬡','⬢','★','☆','©','®','™','°','±','×','÷','≈','≠','≤','≥','∞','∑','√','π','Δ','Ω','λ','μ','σ'],code:['</','/> ','{}','[]','()=>','===','!==','&&','||','??','?.','...','`','${','}','#','@','null','async','await','return','const','let'],math:['∀','∃','∈','∉','∪','∩','⊂','⊃','∧','∨','¬','∂','∫','∇','∏','∑','√','∛','∝','∞','∅','ℕ','ℤ','ℝ','ℂ']};

function initKeyboard(){renderKB('symbols');}
function renderKB(tab){document.getElementById('keyboard-chars').innerHTML=(KB[tab]||[]).map(c=>`<div class="keyboard-char" onclick="insertChar(${JSON.stringify(c)})">${c}</div>`).join('');}
function toggleKeyboard(){document.getElementById('keyboard-panel').classList.toggle('show');}
function switchKeyboardTab(el,tab){document.querySelectorAll('.keyboard-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');renderKB(tab);}
function insertChar(char){const i=document.getElementById('chat-input');if(!i)return;const p=i.selectionStart,v=i.value;i.value=v.substring(0,p)+char+v.substring(p);i.selectionStart=i.selectionEnd=p+char.length;i.focus();}

// FEED
function populateHomeGreeting(){
  if(!currentProfile)return;
  const name=currentProfile.username||'là';
  const init=(currentProfile.username||'DC').substring(0,2).toUpperCase();
  const avatarH=currentProfile.avatar_url?`<img src="${esc(currentProfile.avatar_url)}" alt="avatar">`:init;
  setHtmlSafe('home-greeting-avatar',avatarH);
  setHtmlSafe('composer-avatar',avatarH);
  setEl('home-greeting-title',`Salut, @${name} 👋`);
  const stats=document.getElementById('home-greeting-stats');
  if(stats){
    stats.innerHTML=`
      <div class="hgs-item"><div class="hgs-num">${currentProfile.xp||0}</div><div class="hgs-label">XP</div></div>
      <div class="hgs-item"><div class="hgs-num">${currentProfile.streak||0}</div><div class="hgs-label">Streak</div></div>`;
  }
}
function setHtmlSafe(id,html){const el=document.getElementById(id);if(el)el.innerHTML=html;}

async function loadFeed() {
  const cont = document.getElementById('feed-posts');
  populateHomeGreeting();
  const { data: posts, error } = await db
    .from('posts')
    .select('*, profiles(username, avatar_url, specialty, is_premium, premium_tier, title)')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error || !posts || posts.length === 0) {
    cont.innerHTML = '<div class="empty-state"><div class="empty-state-icon">◆</div><div class="empty-state-text">Aucun post pour l\'instant.</div><div class="empty-state-sub">Sois le premier à publier !</div></div>';
    return;
  }
  // Charger les likes du user connecté pour savoir quels posts il a likés
  let myLikes = new Set();
  if (currentUser) {
    const { data: lk } = await db.from('post_likes').select('post_id').eq('user_id', currentUser.id);
    if (lk) lk.forEach(l => myLikes.add(l.post_id));
  }
  const specLabels = { web_dev: 'Dev Web', mobile_dev: 'Mobile', backend_dev: 'Backend', fullstack_dev: 'Fullstack', cybersecurity: 'Cybersec', devops: 'DevOps', data: 'Data', ai_ml: 'IA/ML', designer_ux: 'Design', recruiter: 'Recruteur' };
  cont.innerHTML = posts.map(p => {
    const prof = p.profiles || {};
    const name = prof.username || 'Inconnu';
    const displayName = prof.display_name || name; // texte affiché
    const init = displayName.substring(0, 2).toUpperCase();
    const avatarHtmlPost = prof.avatar_url ? `<img src="${esc(prof.avatar_url)}" alt="avatar">` : init;
    const prem = prof.premium_tier === 'devconnect-plus' ? '<span class="premium-badge devconnectplus">DevConnect+</span>' : prof.is_premium ? '<span class="premium-badge devplus">Dev+</span>' : '';
    const spec = prof.specialty ? `<span class="badge-inline">${esc(specLabels[prof.specialty] || prof.specialty)}</span>` : '';
    const sub = prof.title || prof.specialty ? (prof.title || specLabels[prof.specialty] || prof.specialty) : '';
    const liked = myLikes.has(p.id);
    const timeStr = timeAgo(p.created_at);
    return `<div class="post-card" data-post-id="${esc(p.id)}">
      <div class="post-header">
        <div class="post-avatar" style="cursor:pointer" onclick="openProfile('${esc(name)}')">${avatarHtmlPost}</div>
        <div class="post-meta">
          <div class="post-name" style="cursor:pointer" onclick="openProfile('${esc(name)}')">${esc(displayName)} ${spec} ${prem}</div>
          <div class="post-role">${esc(sub)}</div>
        </div>
        <div class="post-time">${timeStr}</div>
      </div>
      <div class="post-content">${esc(p.content).replace(/`([^`]+)`/g, '<code>$1</code>')}</div>
      <div class="post-actions">
        <button class="post-action ${liked ? 'post-liked' : ''}" onclick="toggleLike('${esc(p.id)}',this)">◆ <span class="like-count">${p.likes_count || 0}</span></button>
        <button class="post-action" onclick="showToast('Les commentaires arrivent bientôt 👀','info')">◇ Commenter</button>
        <button class="post-action" onclick="sharePost('${esc(p.id)}')">⬡ Partager</button>
      </div>
    </div>`;
  }).join('');
}
function sharePost(postId){
  const url=window.location.origin+window.location.pathname+'#post-'+postId;
  navigator.clipboard?.writeText(url).then(()=>{
    showToast('Lien du post copié !','success');
  }).catch(()=>{
    showToast('Impossible de copier le lien.','error');
  });
}

async function toggleLike(postId, btn) {
  if (!currentUser) { showToast('Connecte-toi pour liker.', 'error'); return; }
  const liked = btn.classList.contains('post-liked');
  const countEl = btn.querySelector('.like-count');
  if (liked) {
    btn.classList.remove('post-liked');
    countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
    await db.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id);
  } else {
    btn.classList.add('post-liked');
    countEl.textContent = parseInt(countEl.textContent) + 1;
    await db.from('post_likes').insert({ post_id: postId, user_id: currentUser.id });
  }
}

async function publishPost() {
  if (!currentUser) { showToast('Connecte-toi pour publier.', 'error'); return; }
  const content = document.getElementById('post-composer').value.trim();
  if (!content) return;
  if (content.length > 2000) { showToast('Post trop long (2000 caractères max).', 'error'); return; }
  const { error } = await db.from('posts').insert({ user_id: currentUser.id, content });
  if (error) { showToast('Erreur lors de la publication : ' + error.message, 'error'); return; }
  document.getElementById('post-composer').value = '';
  await db.rpc('add_xp', { user_id: currentUser.id, amount: 5, action_label: 'post_created' });
  await loadProfile();
  showToast('Post publié ! +5 XP', 'success');
  await loadFeed();
}
function insertTag(type){const ta=document.getElementById('post-composer');const tags={code:'`code ici`',link:'[texte](https://)' };const p=ta.selectionStart,v=ta.value;ta.value=v.substring(0,p)+(tags[type]||'')+v.substring(p);ta.focus();}

// DISCOVER
let discoverFilter = 'all', discoverSubFilters = [], discoverSearch = '';

async function loadDiscover() {
  const cont = document.getElementById('dev-results');
  cont.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;font-family:var(--font-mono)">Chargement...</div>';
  let q = db.from('profiles').select('username,avatar_url,specialty,tech_stack,title,is_premium,premium_tier,xp,available_for_pairing').eq('is_banned', false).order('xp', { ascending: false }).limit(40);
  if (discoverFilter !== 'all') q = q.eq('specialty', discoverFilter);
  if (discoverSearch) q = q.ilike('username', `%${discoverSearch}%`);
  const { data } = await q;
  if (!data || data.length === 0) {
    cont.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;font-family:var(--font-mono)">Aucun profil trouvé.</div>';
    return;
  }
  const specLabels = { web_dev: 'Dev Web', mobile_dev: 'Mobile', backend_dev: 'Backend', fullstack_dev: 'Fullstack', cybersecurity: 'Cybersec', devops: 'DevOps', data: 'Data', ai_ml: 'IA/ML', designer_ux: 'Design', recruiter: 'Recruteur' };
  // Filtrage par sub-filters si actifs
  let filtered = data;
  if (discoverSubFilters.length > 0) {
    filtered = data.filter(u => {
      const stack = u.tech_stack || [];
      return discoverSubFilters.some(sf => stack.some(t => t.toLowerCase() === sf.toLowerCase()));
    });
  }
  if (filtered.length === 0) {
    cont.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;font-family:var(--font-mono)">Aucun profil avec ces filtres.</div>';
    return;
  }
  cont.innerHTML = filtered.map(u => {
    const name = u.username || 'Inconnu';
    const init = name.substring(0, 2).toUpperCase();
    const avatarH = u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="avatar">` : init;
    const prem = u.premium_tier === 'devconnect-plus' ? '<span class="premium-badge devconnectplus">DevConnect+</span>' : u.is_premium ? '<span class="premium-badge devplus">Dev+</span>' : '';
    const stack = (u.tech_stack || []).slice(0, 4).map(t => `<span class="stack-tag">${esc(t)}</span>`).join('');
    const sub = u.title || (u.specialty ? specLabels[u.specialty] || u.specialty : '');
    return `<div class="dev-card">
      <div class="dev-avatar">${avatarH}</div>
      <div class="dev-info">
        <div class="dev-name">${esc(name)} ${prem}</div>
        <div class="dev-title">${esc(sub)}</div>
        <div class="dev-stack">${stack}</div>
        ${u.available_for_pairing?'<div class="badge-inline" style="margin-top:4px">🤝 Dispo pair programming</div>':''}
      </div>
      <div class="dev-actions">
        <div class="dev-rate" style="font-size:11px;color:var(--text-muted)">${u.xp || 0} XP</div>
        <button class="btn btn-ghost btn-sm" onclick="openProfile('${esc(u.username)}')">Profil</button>
        <button class="btn btn-primary btn-sm" onclick="openProfile('${esc(u.username)}')">Contacter</button>
      </div>
    </div>`;
  }).join('');
  loadAiSuggestions();
}

function setFilter(el, f) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  discoverFilter = f;
  discoverSubFilters = [];
  loadSubFilters(f);
  loadDiscover();
}

function loadSubFilters(f) {
  const s = { web_dev: ['React', 'Vue', 'Angular', 'Node.js', 'TypeScript', 'PHP'], cybersecurity: ['Pentest', 'OSINT', 'Forensics', 'Bug Bounty', 'CTF'], devops: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD'], data: ['Python', 'SQL', 'Spark', 'Power BI'], ai_ml: ['LLM', 'PyTorch', 'TensorFlow', 'NLP'], mobile_dev: ['React Native', 'Flutter', 'Swift', 'Kotlin'], all: [], recruiter: [] };
  document.getElementById('sub-filters').innerHTML = (s[f] || []).map(x => `<button class="sub-filter" onclick="toggleSubFilter(this,'${x}')">${x}</button>`).join('');
}

function toggleSubFilter(el, tag) {
  el.classList.toggle('active');
  if (el.classList.contains('active')) discoverSubFilters.push(tag);
  else discoverSubFilters = discoverSubFilters.filter(t => t !== tag);
  loadDiscover();
}

function filterDevs(q) {
  discoverSearch = q;
  clearTimeout(window._dt);
  window._dt = setTimeout(loadDiscover, 300);
}

// RECRUTEMENT — OFFRES RÉELLES
function openJobModal(){
  if(!currentUser){showToast('Connecte-toi pour publier une offre.','error');return;}
  document.getElementById('job-modal').classList.add('show');
}
function closeJobModal(){document.getElementById('job-modal').classList.remove('show');}

async function publishJob(){
  const title=getVal('job-title').trim();
  const company=getVal('job-company').trim();
  const budget=getVal('job-budget').trim();
  const desc=getVal('job-desc').trim();
  const tags=getVal('job-tags').split(',').map(t=>t.trim()).filter(Boolean);
  if(!title||!desc){showToast('Titre et description obligatoires.','error');return;}
  const{error}=await db.from('job_posts').insert({user_id:currentUser.id,title,company,budget,description:desc,tags});
  if(error){showToast('Erreur lors de la publication : '+error.message,'error');return;}
  showToast('Offre publiée !','success');
  closeJobModal();
  document.getElementById('job-title').value='';document.getElementById('job-company').value='';document.getElementById('job-budget').value='';document.getElementById('job-desc').value='';document.getElementById('job-tags').value='';
  await loadJobs();
}

async function loadJobs(){
  const cont=document.getElementById('job-list');
  if(!cont)return;
  const{data,error}=await db.from('job_posts').select('*,profiles(username)').order('created_at',{ascending:false}).limit(30);
  if(error||!data||data.length===0){cont.innerHTML='<div class="empty-state"><div class="empty-state-icon">⬡</div><div class="empty-state-text">Aucune offre pour l\'instant.</div><div class="empty-state-sub">Sois le premier à publier une mission !</div></div>';return;}
  cont.innerHTML=data.map(j=>{
    const tags=(j.tags||[]).map(t=>`<span class="stack-tag">${esc(t)}</span>`).join('');
    const author=j.profiles?.username?`<span style="cursor:pointer" onclick="event.stopPropagation();openProfile('${esc(j.profiles.username)}')">par @${esc(j.profiles.username)}</span>`:'';
    return`<div class="job-card"><div class="job-header"><div><div class="job-title">${esc(j.title)}</div><div class="job-company">${esc(j.company||'')} ${author?'· '+author:''}</div></div><div class="job-budget">${esc(j.budget||'')}</div></div><div class="job-desc">${esc(j.description)}</div><div class="job-tags">${tags}</div></div>`;
  }).join('');
}
function githubUsernameFromUrl(url){
  if(!url)return null;
  const m=url.match(/github\.com\/([^\/\s#?]+)/i);
  return m?m[1]:null;
}
function githubHeatmapHtml(githubUrl){
  const u=githubUsernameFromUrl(githubUrl);
  if(!u)return '';
  return `<div style="margin-top:10px"><div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:4px">Activité GitHub</div><img src="https://ghchart.rshah.org/8a8ac8/${esc(u)}" alt="GitHub activity" style="width:100%;border-radius:var(--radius);border:1px solid var(--border)" loading="lazy"></div>`;
}

async function openProfile(username){
  if(!username)return;
  const modal=document.getElementById('view-profile-modal');
  const body=document.getElementById('view-profile-body');
  modal.classList.add('show');
  body.innerHTML='<div style="padding:24px;color:var(--text-muted);font-size:13px">Chargement...</div>';
  const{data:p}=await db.from('profiles').select('*').eq('username',username).maybeSingle();
  if(!p){body.innerHTML='<div style="padding:24px;color:var(--text-muted);font-size:13px">Profil introuvable.</div>';return;}
  const specLabels={web_dev:'Dev Web',mobile_dev:'Dev Mobile',backend_dev:'Dev Backend',fullstack_dev:'Fullstack',cybersecurity:'Cybersécurité',devops:'DevOps',data:'Data',ai_ml:'IA / ML',designer_ux:'Designer UX',recruiter:'Recruteur tech'};
  const init=(p.username||'DC').substring(0,2).toUpperCase();
  const avatarH=p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="avatar" style="width:100%;height:100%;object-fit:cover">`:init;
  const bannerStyle=p.banner_url?`background:url('${esc(p.banner_url)}') center/cover`:p.profile_color?`background:${esc(p.profile_color)}`:`background:linear-gradient(135deg,var(--bg3),var(--bg2))`;
  const prem=p.premium_tier==='devconnect-plus'?'<span class="premium-badge devconnectplus">DevConnect+</span>':p.is_premium?'<span class="premium-badge devplus">Dev+</span>':'';
  const stack=(p.tech_stack||[]).slice(0,6).map(t=>`<span class="stack-tag">${esc(t)}</span>`).join('');
  const links=[p.github_url?`<a href="${esc(p.github_url)}" target="_blank" class="profile-link">GitHub</a>`:'',p.linkedin_url?`<a href="${esc(p.linkedin_url)}" target="_blank" class="profile-link">LinkedIn</a>`:'',p.portfolio_url?`<a href="${esc(p.portfolio_url)}" target="_blank" class="profile-link">Portfolio</a>`:''].filter(Boolean).join('');
  body.innerHTML=`
    <div style="height:70px;border-radius:var(--radius-lg) var(--radius-lg) 0 0;margin:-8px -4px 0;${bannerStyle}"></div>
    <div style="width:60px;height:60px;border-radius:50%;background:var(--bg2);border:3px solid var(--bg1);overflow:hidden;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);color:var(--accent);font-size:18px;margin:-30px auto 8px">${avatarH}</div>
    <div style="font-weight:600;font-size:16px">${esc(p.username||'Utilisateur')} ${prem}</div>
    <div style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono)">@${esc(p.username||'')}</div>
    <div style="font-size:13px;color:var(--text-secondary);margin:10px 0">${esc(p.bio||'Aucune bio renseignée.')}</div>
    ${p.specialty?`<div class="profile-badge" style="display:inline-block;margin-bottom:10px">${esc(specLabels[p.specialty]||p.specialty)}</div>`:''}
    <div style="display:flex;justify-content:center;gap:18px;margin:10px 0;font-size:12px;color:var(--text-muted)">
      <span><strong style="color:var(--text)">${p.xp||0}</strong> xp</span>
      <span id="profile-followers-count"><strong style="color:var(--text)">…</strong> abonnés</span>
      <span id="profile-following-count"><strong style="color:var(--text)">…</strong> abonnements</span>
    </div>
    ${stack?`<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:10px">${stack}</div>`:''}
    ${links?`<div class="profile-links" style="justify-content:center">${links}</div>`:''}
    ${p.available_for_pairing?'<div class="badge-inline" style="margin-top:8px">🤝 Dispo pour pair programming</div>':''}
    ${githubHeatmapHtml(p.github_url)}
    <div id="view-profile-projects" style="text-align:left;margin-top:14px"></div>
    ${currentUser&&p.id!==currentUser?.id?`<button class="btn btn-primary w-full" style="margin-top:14px" id="follow-btn" onclick="toggleFollow('${esc(p.id)}')">Suivre</button>`:''}
    ${currentUser&&p.id!==currentUser?.id?`<button class="btn btn-ghost w-full" style="margin-top:8px" onclick="closeProfileModal();startDm('${esc(p.id)}','${esc(p.username||'')}')">✉ Message direct</button>`:''}
    ${currentUser&&p.id!==currentUser?.id&&p.available_for_pairing?`<button class="btn btn-ghost w-full" style="margin-top:8px" onclick="requestPairingSession('${esc(p.id)}','${esc(p.username||'')}')">🤝 Demander une session de pair programming</button>`:''}
    ${currentUser&&p.id!==currentUser?.id?`<button class="btn btn-ghost w-full" style="margin-top:8px;color:#e05a5a" onclick="closeProfileModal();openReportModal('${esc(p.id)}','${esc(p.username||'')}')">⚠ Signaler ce profil</button>`:''}
  `;
  loadFollowCounts(p.id);
  if(currentUser&&p.id!==currentUser.id)checkFollowState(p.id);
  loadProfileModalProjects(p.id,p.username);
}

async function loadProfileModalProjects(profileId,username){
  const cont=document.getElementById('view-profile-projects');
  if(!cont)return;
  const{data}=await db.from('projects').select('*').eq('user_id',profileId).order('created_at',{ascending:false}).limit(5);
  if(!data||data.length===0)return;
  cont.innerHTML=`<div style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Projets</div>`+
    data.map(p=>`<div class="project-card" style="margin-bottom:8px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div class="project-name" style="font-size:13px">${esc(p.name||'')} ${p.looking_for_collab?'<span class="badge-inline" style="margin-left:4px">🤝</span>':''}</div>
        ${p.github_url?`<a href="${esc(p.github_url)}" target="_blank" class="btn btn-ghost btn-sm">GitHub</a>`:''}
      </div>
      <div class="project-desc markdown-body" style="font-size:12px">${renderMarkdown(p.description)}</div>
      ${p.stack&&p.stack.length?`<div class="project-stack">${p.stack.map(s=>`<span class="stack-tag">${esc(s)}</span>`).join('')}</div>`:''}
      ${p.looking_for_collab&&currentUser&&currentUser.id!==profileId?`<button class="btn btn-ghost btn-sm" style="margin-top:6px" onclick="expressProjectInterest('${esc(p.id)}','${esc(profileId)}','${esc(p.name||'')}')">🤝 Je suis intéressé(e)</button>`:''}
    </div>`).join('');
  cont.querySelectorAll('pre code').forEach(b=>{try{hljs.highlightElement(b);}catch(e){}});
}

async function loadFollowCounts(profileId){
  const[{count:followers},{count:following}]=await Promise.all([
    db.from('follows').select('*',{count:'exact',head:true}).eq('followed_id',profileId),
    db.from('follows').select('*',{count:'exact',head:true}).eq('follower_id',profileId)
  ]);
  const fEl=document.getElementById('profile-followers-count'),gEl=document.getElementById('profile-following-count');
  if(fEl)fEl.innerHTML=`<strong style="color:var(--text)">${followers||0}</strong> abonnés`;
  if(gEl)gEl.innerHTML=`<strong style="color:var(--text)">${following||0}</strong> abonnements`;
}
async function checkFollowState(targetId){
  const{data}=await db.from('follows').select('id').eq('follower_id',currentUser.id).eq('followed_id',targetId).maybeSingle();
  const btn=document.getElementById('follow-btn');
  if(!btn)return;
  if(data){btn.textContent='✓ Suivi(e)';btn.classList.remove('btn-primary');btn.classList.add('btn-ghost');btn.dataset.following='1';}
  else{btn.textContent='Suivre';btn.classList.add('btn-primary');btn.classList.remove('btn-ghost');btn.dataset.following='0';}
}
async function toggleFollow(targetId){
  if(!currentUser){showToast('Connecte-toi pour suivre ce profil.','error');return;}
  const btn=document.getElementById('follow-btn');
  const isFollowing=btn?.dataset.following==='1';
  if(isFollowing){
    const{error}=await db.from('follows').delete().eq('follower_id',currentUser.id).eq('followed_id',targetId);
    if(error){showToast('Erreur : '+error.message,'error');return;}
  } else {
    const{error}=await db.from('follows').insert({follower_id:currentUser.id,followed_id:targetId});
    if(error){showToast('Erreur : '+error.message,'error');return;}
    await notifyUser(targetId,'follow',`@${currentProfile.username} a commencé à te suivre.`,null);
  }
  await checkFollowState(targetId);
  await loadFollowCounts(targetId);
}
function closeProfileModal(){document.getElementById('view-profile-modal').classList.remove('show');}

// SIGNALEMENT
let reportTargetId=null,reportTargetUsername=null;
function openReportModal(targetId,targetUsername){
  if(!currentUser){showToast('Connecte-toi pour signaler un profil.','error');return;}
  if(targetId===currentUser.id){showToast('Tu ne peux pas te signaler toi-même.','error');return;}
  reportTargetId=targetId;reportTargetUsername=targetUsername;
  setEl('report-target-label','@'+targetUsername);
  setVal('report-reason','');
  document.getElementById('report-modal').classList.add('show');
}
function closeReportModal(){document.getElementById('report-modal').classList.remove('show');}
async function submitReport(){
  if(!currentUser||!reportTargetId)return;
  const reason=getVal('report-reason').trim();
  if(!reason){showToast('Décris le problème avant d\'envoyer.','error');return;}
  const{error}=await db.from('report_tickets').insert({
    reporter_id:currentUser.id,
    target_id:reportTargetId,
    category:getVal('report-category'),
    priority:getVal('report-priority'),
    reason,
    status:'open'
  });
  if(error){showToast('Erreur lors de l\'envoi : '+error.message,'error');return;}
  closeReportModal();
  showToast('Signalement envoyé. L\'équipe de modération va l\'examiner.','success');
}

function closeAiPanel(){document.getElementById('ai-panel').style.display='none';document.getElementById('reopen-ai-btn').style.display='flex';}
function reopenAiPanel(){document.getElementById('ai-panel').style.display='block';document.getElementById('reopen-ai-btn').style.display='none';}

async function loadAiSuggestions(){
  const cont=document.getElementById('ai-suggestions-list');
  if(!cont)return;
  const{data}=await db.from('profiles').select('username,specialty,xp,is_premium').eq('is_banned',false).order('xp',{ascending:false}).limit(2);
  if(!data||data.length===0){cont.innerHTML='<div style="font-size:12px;color:var(--text-muted)">Pas assez de profils pour le moment.</div>';return;}
  const specLabels={web_dev:'Dev Web',mobile_dev:'Dev Mobile',backend_dev:'Dev Backend',fullstack_dev:'Fullstack',cybersecurity:'Cybersécurité',devops:'DevOps',data:'Data',ai_ml:'IA/ML',designer_ux:'Designer UX',recruiter:'Recruteur'};
  cont.innerHTML=data.map(u=>{
    const score=Math.min(99,50+Math.floor((u.xp||0)/20)+(u.is_premium?5:0));
    return`<div class="ai-suggestion" style="cursor:pointer" onclick="openProfile('${esc(u.username)}')"><div class="ai-suggestion-name">${esc(u.username)}</div><div class="ai-suggestion-reason">${esc(specLabels[u.specialty]||u.specialty||'Profil tech')} · ${u.xp||0} XP</div><div class="ai-suggestion-score">◆ Score fiabilité : ${score}%</div></div>`;
  }).join('');
}

// LEARN
// ── LEARN PAGE — filtres réels + rendu dynamique ─────────────────────
let activeLearnCat='all';
let activeDiffs=new Set(['easy','medium','hard','extreme']);
const CAT_LABELS={all:'Tous',cybersecurity:'Cybersécurité',web_dev:'Dev Web',algorithm:'Algorithmes',devops:'DevOps',data:'Data',ai_ml:'IA / ML'};
const DIFF_LABELS={easy:'Facile',medium:'Moyen',hard:'Hard',extreme:'Extrême'};
let completedChallenges=new Set();

function setLearnCat(el,cat){
  document.querySelectorAll('.learn-cat').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  activeLearnCat=cat;
  renderChallenges();
}
function toggleDiff(btn,diff){
  btn.classList.toggle('active');
  if(activeDiffs.has(diff))activeDiffs.delete(diff);else activeDiffs.add(diff);
  renderChallenges();
}
function renderChallenges(){
  const list=document.getElementById('challenges-list');if(!list)return;
  const entries=Object.entries(challenges).filter(([id,c])=>{
    const catOk=activeLearnCat==='all'||c.cat===activeLearnCat;
    const diffOk=activeDiffs.has(c.diff);
    return catOk&&diffOk;
  });
  if(!entries.length){
    list.innerHTML='<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;font-family:var(--font-mono)">Aucun challenge pour ces filtres.</div>';
    return;
  }
  const catIcon={cybersecurity:'⬡',web_dev:'◉',algorithm:'◆',devops:'⬢',data:'◇',ai_ml:'⬟'};
  list.innerHTML=entries.map(([id,c])=>{
    const done=completedChallenges.has(id);
    return`<div class="challenge-card${done?' done':''}" onclick="openChallenge('${id}')" style="${done?'opacity:.6;border-color:var(--accent-dim)':''}">
      <div class="challenge-header">
        <div class="challenge-title">${done?'✓ ':''} ${esc(c.title)}</div>
        <span class="diff-badge ${c.diff}">${DIFF_LABELS[c.diff]||c.diff}</span>
      </div>
      <div class="challenge-desc">${esc(c.desc.substring(0,120))}…</div>
      <div class="challenge-meta">
        <span>${catIcon[c.cat]||'◈'} ${CAT_LABELS[c.cat]||c.cat}</span>
        <span>◆ ${c.xp} XP</span>
        ${done?'<span style="color:var(--accent-dim)">✓ Résolu</span>':''}
      </div>
    </div>`;
  }).join('');
}
async function loadLearnProgress(){
  const el=document.getElementById('learn-progress');if(!el)return;
  if(!currentUser){el.innerHTML='<div style="font-size:12px;color:var(--text-muted)">Connecte-toi pour suivre ta progression.</div>';return;}
  const{data}=await db.from('challenge_completions').select('challenge_id,xp_gained').eq('user_id',currentUser.id);
  completedChallenges=new Set((data||[]).map(r=>r.challenge_id));
  const totalXP=(data||[]).reduce((s,r)=>s+(r.xp_gained||0),0);
  const total=Object.keys(challenges).length;
  el.innerHTML=`
    <div style="font-size:22px;font-weight:700;font-family:var(--font-display)">${completedChallenges.size}<span style="font-size:13px;color:var(--text-muted);font-weight:400"> / ${total}</span></div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">challenges résolus</div>
    <div style="font-size:18px;font-weight:600;color:var(--accent-dim)">+${totalXP} XP</div>
    <div style="font-size:11px;color:var(--text-muted)">gagnés sur cette section</div>
    <div style="margin-top:12px;height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">
      <div style="height:100%;width:${Math.round(completedChallenges.size/total*100)}%;background:var(--accent-dim);border-radius:2px;transition:width .4s"></div>
    </div>`;
  renderChallenges();
}

// CHALLENGES
const challenges={
  /* ── CYBERSÉCURITÉ ─────────────────────────────────────────────── */
  'sql-injection':{cat:'cybersecurity',diff:'hard',xp:150,title:"SQL Injection — Bypass d'authentification",desc:"Une application web a un formulaire de connexion vulnérable. Trouve le payload permettant de te connecter sans connaître le mot de passe en injectant directement dans la requête SQL.",meta:'Cybersécurité · Hard · 150 XP',answer:"' OR '1'='1",hint:"Pense aux caractères qui terminent une chaîne SQL et permettent d'ajouter une condition toujours vraie."},
  'xss-reflected':{cat:'cybersecurity',diff:'medium',xp:100,title:'XSS Réfléchi — Injection de script',desc:"Une page affiche le paramètre GET `q` directement dans le HTML sans encodage. Quel tag HTML minimal permet d'exécuter du JS arbitraire via l'URL ?",meta:'Cybersécurité · Moyen · 100 XP',answer:'script',hint:"Le tag qui délimite un bloc JavaScript dans une page HTML… (réponds juste avec le nom du tag, sans < >)"},
  'hash-crack':{cat:'cybersecurity',diff:'easy',xp:50,title:'Hash cracking — MD5 faible',desc:"Le hash MD5 `5f4dcc3b5aa765d61d8327deb882cf99` correspond à un mot de passe ultra-courant. Lequel ?",meta:'Cybersécurité · Facile · 50 XP',answer:'password',hint:"C'est littéralement le mot de passe le plus utilisé au monde."},
  'docker-escape':{cat:'cybersecurity',diff:'extreme',xp:300,title:'Docker — Container Escape',desc:"Tu es dans un container Docker lancé avec --privileged. Quel périphérique du système hôte peux-tu monter pour accéder au filesystem complet de l'hôte ?",meta:'Cybersécurité · DevOps · Extrême · 300 XP',answer:'/dev/sda1',hint:"En mode privileged, tu as accès aux périphériques de l'hôte. Regarde dans /dev/."},
  'csrf-token':{cat:'cybersecurity',diff:'medium',xp:90,title:'CSRF — Quel en-tête protège ?',desc:"Pour se défendre contre une attaque CSRF (Cross-Site Request Forgery) côté serveur sans utiliser de token de formulaire, quel en-tête HTTP faut-il vérifier ?",meta:'Cybersécurité · Moyen · 90 XP',answer:'origin',hint:"Cet en-tête indique l'origine de la requête et est automatiquement envoyé par le navigateur."},
  /* ── DEV WEB ────────────────────────────────────────────────────── */
  'react-perf':{cat:'web_dev',diff:'medium',xp:80,title:'React — Mémoïsation de composant',desc:"Ce composant fonctionnel React re-render à chaque changement d'état parent même si ses props n'ont pas changé. Quelle fonction React native permet de mémoïser le composant entier ?",meta:'Dev Web · Moyen · 80 XP',answer:'React.memo',hint:"C'est une fonction de mémoïsation spécifique aux composants fonctionnels React."},
  'css-specificity':{cat:'web_dev',diff:'easy',xp:40,title:'CSS — Spécificité sélecteur',desc:"Quel sélecteur CSS a la plus haute spécificité ? `#id`, `.class`, `element`, ou `*` ?",meta:'Dev Web · Facile · 40 XP',answer:'#id',hint:"La spécificité suit l'ordre : inline > ID > class > element."},
  'js-closure':{cat:'web_dev',diff:'medium',xp:90,title:'JavaScript — La puissance des closures',desc:"Une fonction retourne une autre fonction qui a accès à ses variables locales même après son exécution. Comment s'appelle ce mécanisme fondamental du JS ?",meta:'Dev Web · Moyen · 90 XP',answer:'closure',hint:"C'est le fait qu'une fonction 'se souvient' de l'environnement dans lequel elle a été créée."},
  'http-method':{cat:'web_dev',diff:'easy',xp:40,title:'HTTP — Méthode idempotente',desc:"En REST, quelle méthode HTTP est idempotente ET utilisée pour remplacer complètement une ressource existante (pas juste une mise à jour partielle) ?",meta:'Dev Web · Facile · 40 XP',answer:'PUT',hint:"Elle remplace la ressource en entier, contrairement à PATCH qui la modifie partiellement."},
  'async-await':{cat:'web_dev',diff:'hard',xp:130,title:'JS Async — Promise.all vs Promise.allSettled',desc:"Tu veux appeler 3 APIs en parallèle et récupérer TOUS les résultats même si l'une d'elles échoue. Quelle méthode utilises-tu ?",meta:'Dev Web · Hard · 130 XP',answer:'Promise.allSettled',hint:"Contrairement à Promise.all, elle ne rejette pas au premier échec."},
  /* ── ALGORITHMES ────────────────────────────────────────────────── */
  'algo-sort':{cat:'algorithm',diff:'easy',xp:50,title:'Algorithme — Tri O(n log n) stable',desc:"Quel algorithme de tri classique garantit O(n log n) dans tous les cas ET est stable par nature ? (Son nom évoque la fusion de sous-tableaux.)",meta:'Algorithmes · Facile · 50 XP',answer:'merge sort',hint:"Divise pour mieux régner — le tableau est divisé récursivement puis fusionné."},
  'binary-search':{cat:'algorithm',diff:'easy',xp:45,title:'Binary Search — Complexité',desc:"Sur un tableau de 1 000 000 d'éléments trié, combien de comparaisons au maximum fait une recherche dichotomique (binary search) ? Répondre en log2(1000000) arrondi.",meta:'Algorithmes · Facile · 45 XP',answer:'20',hint:"log2(1000000) ≈ 19.93 → arrondi à 20."},
  'dynamic-prog':{cat:'algorithm',diff:'hard',xp:160,title:'DP — Problème du sac à dos',desc:"Quelle technique algorithmique consiste à décomposer un problème en sous-problèmes et mémoriser leurs solutions pour éviter de les recalculer ? (Nom en anglais, 2 mots)",meta:'Algorithmes · Hard · 160 XP',answer:'dynamic programming',hint:"Mémoïsation + récursion ou tableau ascendant."},
  'big-o-hash':{cat:'algorithm',diff:'easy',xp:40,title:"Big O — Accès dans une HashMap",desc:"Quelle est la complexité temporelle moyenne d'un accès (get/put) dans une table de hachage (HashMap) bien implémentée ?",meta:'Algorithmes · Facile · 40 XP',answer:'O(1)',hint:"Avec une bonne fonction de hachage et peu de collisions, l'accès est quasi-instantané."},
  /* ── DEVOPS ─────────────────────────────────────────────────────── */
  'yaml-indent':{cat:'devops',diff:'easy',xp:35,title:'YAML — Erreur de syntaxe classique',desc:"YAML est sensible à un caractère très précis pour l'indentation. Tabulations ou espaces — lequel est interdit dans un fichier YAML valide ?",meta:'DevOps · Facile · 35 XP',answer:'tabulations',hint:"YAML n'accepte que les espaces pour l'indentation, jamais les tabs."},
  'k8s-pod':{cat:'devops',diff:'medium',xp:110,title:'Kubernetes — Unité de déploiement minimale',desc:"Dans Kubernetes, quelle est l'unité de déploiement la plus petite qui peut contenir un ou plusieurs containers partageant le même réseau et stockage ?",meta:'DevOps · Moyen · 110 XP',answer:'pod',hint:"C'est l'abstraction de base dans Kubernetes, un cran au-dessus du container."},
  'ci-cd-stage':{cat:'devops',diff:'medium',xp:80,title:'CI/CD — Ordre des étapes',desc:"Dans un pipeline CI/CD classique, dans quel ordre ces étapes se succèdent-elles ? Réponds avec les initiales dans l'ordre : Build, Test, Deploy. (ex: B-T-D)",meta:'DevOps · Moyen · 80 XP',answer:'B-T-D',hint:"On construit d'abord, on valide ensuite, on livre en dernier."},
  /* ── DATA ───────────────────────────────────────────────────────── */
  'sql-join':{cat:'data',diff:'easy',xp:50,title:'SQL — JOIN retournant uniquement les correspondances',desc:"Quel type de JOIN en SQL retourne uniquement les lignes qui ont une correspondance dans les DEUX tables (aucune valeur NULL introduite) ?",meta:'Data · Facile · 50 XP',answer:'INNER JOIN',hint:"Parmi INNER, LEFT, RIGHT, FULL OUTER — lequel est le plus restrictif ?"},
  'pandas-groupby':{cat:'data',diff:'medium',xp:90,title:'Pandas — Agrégation par groupe',desc:"En Python Pandas, quelle méthode utilises-tu pour regrouper les lignes d'un DataFrame selon une colonne, puis appliquer une fonction d'agrégation (sum, mean...) ?",meta:'Data · Moyen · 90 XP',answer:'groupby',hint:"C'est la méthode analogue à GROUP BY en SQL, directement sur un DataFrame."},
  'null-sql':{cat:'data',diff:'easy',xp:40,title:"SQL — Comparer avec NULL",desc:"En SQL, `SELECT * FROM users WHERE email = NULL` ne retourne jamais de résultats, même si des NULLs existent. Quelle clause faut-il utiliser à la place ?",meta:'Data · Facile · 40 XP',answer:'IS NULL',hint:"NULL ne peut pas être comparé avec = ou !=, il faut un opérateur dédié."},
  /* ── IA / ML ────────────────────────────────────────────────────── */
  'overfitting':{cat:'ai_ml',diff:'easy',xp:50,title:'ML — Trop parfait pour être vrai',desc:"Un modèle obtient 99% de précision sur les données d'entraînement mais seulement 60% sur les données de test. Quel phénomène cela illustre-t-il ?",meta:'IA · Facile · 50 XP',answer:'overfitting',hint:"Le modèle a trop 'appris par cœur' les données d'entraînement."},
  'transformer-attention':{cat:'ai_ml',diff:'hard',xp:170,title:'Transformers — Mécanisme clé',desc:"Le mécanisme central des architectures Transformer (BERT, GPT…), qui permet à chaque token de s'appuyer sur les autres tokens du contexte, s'appelle comment ?",meta:'IA · Hard · 170 XP',answer:'attention',hint:"'Attention is all you need' — c'est littéralement le titre du papier fondateur."},
  'prompt-injection':{cat:'ai_ml',diff:'medium',xp:100,title:'Prompt Injection — Vecteur d\'attaque LLM',desc:"Un utilisateur malveillant insère des instructions dans un champ de texte pour faire ignorer à un LLM ses instructions système. Comment s'appelle cette attaque ?",meta:'IA · Moyen · 100 XP',answer:'prompt injection',hint:"Analogue à l'injection SQL, mais pour les modèles de langage."},
  'activation-fn':{cat:'ai_ml',diff:'medium',xp:85,title:'Réseaux de neurones — Activation populaire',desc:"Quelle fonction d'activation est la plus utilisée dans les couches cachées des réseaux de neurones modernes car elle évite le problème du vanishing gradient (contrairement à sigmoid) ?",meta:'IA · Moyen · 85 XP',answer:'relu',hint:"Rectified Linear Unit — f(x) = max(0, x)."},
};

function openChallenge(id){
  const c=challenges[id];if(!c)return;
  challengeId=id;
  setEl('challenge-modal-title',c.title);
  setEl('challenge-modal-meta',c.meta);
  document.getElementById('challenge-modal-desc').textContent=c.desc;
  document.getElementById('challenge-hints').innerHTML=`<strong style="color:var(--accent-dim)">Indice :</strong> ${c.hint}`;
  document.getElementById('challenge-answer').value='';
  document.getElementById('challenge-feedback').style.display='none';
  document.getElementById('solutions-area').style.display='none';
  document.getElementById('challenge-modal').classList.add('show');
}
function closeChallenge(){document.getElementById('challenge-modal').classList.remove('show');}

function submitChallenge(){
  if(!currentUser){showToast('Connecte-toi pour soumettre.','error');return;}
  const answer=document.getElementById('challenge-answer').value.trim().toLowerCase();
  const c=challenges[challengeId];if(!c)return;
  const ok=answer===c.answer.toLowerCase();
  const fb=document.getElementById('challenge-feedback');
  fb.style.display='block';
  if(ok){
    fb.style.color='#5a9a6a';
    const xpGain=c.xp||0;
    fb.textContent='✓ Correct ! Challenge résolu. +'+xpGain+' XP';
    awardXP(challengeId, xpGain);
    showSolutions();showToast('Challenge résolu ! 🎉','success');
  }else{fb.style.color='#9a5a5a';fb.textContent='✗ Pas tout à fait... Réessaie ou consulte l\'indice.';}
}

async function awardXP(cid, xpGain) {
  if(!currentUser||!xpGain)return;
  const{data:existing}=await db.from('challenge_completions').select('id').eq('user_id',currentUser.id).eq('challenge_id',cid).maybeSingle();
  if(existing)return;
  await db.from('challenge_completions').insert({user_id:currentUser.id,challenge_id:cid,xp_gained:xpGain});
  await db.rpc('add_xp', {user_id:currentUser.id, amount:xpGain, action_label:'challenge_completed'});
  await loadProfile();
  loadLearnProgress();
  showToast(`+${xpGain} XP ajoutés à ton profil !`,'success');
}

function showSolutions(){
  const c=challenges[challengeId];if(!c)return;
  document.getElementById('solutions-area').style.display='block';
  document.getElementById('solutions-list').innerHTML=`<div class="solution-item"><strong>Réponse :</strong> ${esc(c.answer)}</div><div style="margin-top:8px;font-size:12px;color:var(--text-muted)">${esc(c.hint)}</div>`;
}

// EDITOR AI
// ÉDITEUR — VRAI SYSTÈME DE FICHIERS (en mémoire, par session)
let editorFiles={'main.js':'// Bienvenue dans l\'éditeur DevConnect\n// Utilise l\'IA à droite pour déboguer ton code\n\nconsole.log("Hello DevConnect !");'};
let activeEditorFile='main.js';
let _editorSaveTimer=null;
let _editorUnsaved=false;

async function loadEditorFiles(){
  if(!currentUser){renderEditorFileTree();return;}
  const{data,error}=await db.from('editor_files').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:true});
  if(error){console.error('loadEditorFiles:',error);renderEditorFileTree();return;}
  if(data&&data.length>0){
    editorFiles={};
    data.forEach(f=>{editorFiles[f.filename]=f.content||'';});
    activeEditorFile=Object.keys(editorFiles)[0];
  }
  renderEditorFileTree();
}

async function persistEditorFile(filename,content){
  if(!currentUser)return;
  setEditorSaveStatus('saving');
  const{error}=await db.from('editor_files').upsert({user_id:currentUser.id,filename,content,updated_at:new Date().toISOString()},{onConflict:'user_id,filename'});
  if(error){console.error('persistEditorFile:',error);setEditorSaveStatus('error');}
  else{setEditorSaveStatus('saved');_editorUnsaved=false;renderEditorFileTree();}
}

async function deleteEditorFilePersist(filename){
  if(!currentUser)return;
  await db.from('editor_files').delete().eq('user_id',currentUser.id).eq('filename',filename);
}

function setEditorSaveStatus(state){
  const el=document.getElementById('editor-save-status');
  if(!el)return;
  if(state==='saving'){el.textContent='⟳ Enregistrement...';el.style.color='var(--text-muted)';}
  else if(state==='saved'){el.textContent='✓ Enregistré';el.style.color='var(--accent-dim)';setTimeout(()=>{if(el)el.textContent='';},2500);}
  else if(state==='unsaved'){el.textContent='● Non enregistré';el.style.color='#e0a05a';}
  else{el.textContent='';}}

function scheduleEditorSave(){
  _editorUnsaved=true;
  setEditorSaveStatus('unsaved');
  if(_editorSaveTimer)clearTimeout(_editorSaveTimer);
  _editorSaveTimer=setTimeout(()=>{persistEditorFile(activeEditorFile,editorFiles[activeEditorFile]||'');},1500);
}

function fileIconFor(name){
  if(name.endsWith('.css'))return'<span style="color:#5a9fd4">◇</span>';
  if(name.endsWith('.html'))return'<span style="color:#e06a3a">⬡</span>';
  if(name.endsWith('.json'))return'<span style="color:#5abf78">◈</span>';
  if(name.endsWith('.md'))return'<span style="color:#a57de0">◆</span>';
  if(name.endsWith('.ts'))return'<span style="color:#5a9fd4">◉</span>';
  if(name.endsWith('.py'))return'<span style="color:#f7d65a">◉</span>';
  if(name.endsWith('.sql'))return'<span style="color:#e0a05a">◉</span>';
  return'<span style="color:#e0c45a">◉</span>';
}
function langFor(name){
  if(name.endsWith('.css'))return'CSS';
  if(name.endsWith('.md'))return'Markdown';
  if(name.endsWith('.json'))return'JSON';
  if(name.endsWith('.html'))return'HTML';
  if(name.endsWith('.py'))return'Python';
  return'JavaScript';
}

function renderEditorFileTree(){
  const tree=document.getElementById('editor-file-tree');
  const tabs=document.getElementById('editor-tabs');
  if(!tree||!tabs)return;
  const names=Object.keys(editorFiles);
  tree.innerHTML=names.map(n=>`<div class="file-item ${n===activeEditorFile?'active':''}" onclick="switchEditorFile('${esc(n)}')"><span class="file-icon">${fileIconFor(n)}</span>${esc(n)}<span onclick="event.stopPropagation();deleteEditorFile('${esc(n)}')" style="margin-left:auto;opacity:.5;cursor:pointer;padding:0 4px">×</span></div>`).join('');
  tabs.innerHTML=names.map(n=>`<button class="editor-tab ${n===activeEditorFile?'active':''}" onclick="switchEditorFile('${esc(n)}')">${fileIconFor(n)} ${esc(n)}</button>`).join('');
  document.getElementById('code-editor').value=editorFiles[activeEditorFile]||'';
  document.getElementById('editor-lang-label').textContent=langFor(activeEditorFile);
}

function switchEditorFile(name){activeEditorFile=name;renderEditorFileTree();}
function onEditorEdit(){editorFiles[activeEditorFile]=document.getElementById('code-editor').value;scheduleEditorSave();}

function createEditorFile(){
  const name=prompt('Nom du nouveau fichier (ex: utils.js) :');
  if(!name)return;
  if(editorFiles[name]){showToast('Ce fichier existe déjà.','error');return;}
  editorFiles[name]='';
  activeEditorFile=name;
  persistEditorFile(name,'');
  renderEditorFileTree();
}

function deleteEditorFile(name){
  if(Object.keys(editorFiles).length<=1){showToast('Il doit rester au moins un fichier.','error');return;}
  delete editorFiles[name];
  deleteEditorFilePersist(name);
  if(activeEditorFile===name)activeEditorFile=Object.keys(editorFiles)[0];
  renderEditorFileTree();
}

function importEditorFile(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    editorFiles[file.name]=reader.result;
    activeEditorFile=file.name;
    persistEditorFile(file.name,reader.result);
    renderEditorFileTree();
    showToast(`Fichier "${file.name}" importé.`,'success');
  };
  reader.readAsText(file);
  input.value='';
}

function downloadEditorFile(){
  const content=editorFiles[activeEditorFile]||'';
  const blob=new Blob([content],{type:'text/plain'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=activeEditorFile;
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function runEditorPreview(){
  const names=Object.keys(editorFiles);
  const htmlFile=names.find(n=>n.toLowerCase().endsWith('.html'));
  const cssFiles=names.filter(n=>n.toLowerCase().endsWith('.css'));
  const jsFiles=names.filter(n=>n.toLowerCase().endsWith('.js'));
  const cssBlock=cssFiles.map(n=>`<style>${editorFiles[n]}</style>`).join('\n');
  const jsBlock=jsFiles.map(n=>`<script>${editorFiles[n]}</script>`).join('\n');
  let doc;
  if(htmlFile){
    doc=editorFiles[htmlFile];
    if(doc.includes('</head>'))doc=doc.replace('</head>',cssBlock+'</head>');
    else doc=cssBlock+doc;
    if(doc.includes('</body>'))doc=doc.replace('</body>',jsBlock+'</body>');
    else doc=doc+jsBlock;
  }else{
    doc=`<!DOCTYPE html><html><head>${cssBlock}</head><body>${jsFiles.length?'':'<p style="font-family:sans-serif;color:#888;padding:20px">Aucun fichier HTML — exécution du JS uniquement, voir la console.</p>'}${jsBlock}</body></html>`;
  }
  document.getElementById('preview-iframe').srcdoc=doc;
  document.getElementById('preview-modal').classList.add('show');
}
function closePreviewModal(){document.getElementById('preview-modal').classList.remove('show');}

function getAiKey(){return localStorage.getItem('dc_openrouter_key')||'';}
function promptAiKey(){
  const current=getAiKey();
  const key=prompt('Colle ta clé API OpenRouter (openrouter.ai) :\n\nElle sera stockée uniquement dans ton navigateur.',current||'');
  if(key===null)return;
  if(key.trim()){localStorage.setItem('dc_openrouter_key',key.trim());showToast('Clé API enregistrée ✓','success');document.getElementById('editor-ai-key-banner').style.display='none';}
  else{localStorage.removeItem('dc_openrouter_key');showToast('Clé supprimée','info');}
}
function checkAiKeyBanner(){
  const banner=document.getElementById('editor-ai-key-banner');
  if(banner)banner.style.display=getAiKey()?'none':'flex';
}

// Historique de conversation IA (mémoire entre les messages)
let _aiHistory=[];

function clearAiHistory(){
  _aiHistory=[];
  const c=document.getElementById('editor-ai-messages');
  if(c)c.innerHTML='<div class="ai-msg ai">Conversation réinitialisée. Comment puis-je t\'aider ?</div>';
}

async function sendEditorAI(){
  if(!currentUser){showToast('Connecte-toi pour utiliser l\'IA.','error');return;}
  const key=getAiKey();
  if(!key){
    document.getElementById('editor-ai-key-banner').style.display='flex';
    promptAiKey();
    return;
  }
  const input=document.getElementById('editor-ai-input');
  const msg=input.value.trim();if(!msg)return;
  input.value='';
  input.disabled=true;
  const c=document.getElementById('editor-ai-messages');
  c.innerHTML+=`<div class="ai-msg user">${esc(msg)}</div><div class="ai-msg ai" id="ai-typing"><span class="ai-thinking">●●●</span></div>`;
  c.scrollTop=c.scrollHeight;
  const code=document.getElementById('code-editor').value;
  const systemPrompt=`Tu es un assistant de code expert intégré dans DevConnect, une plateforme pour développeurs. Tu aides à déboguer, optimiser et expliquer du code. Réponds en français, de manière concise et précise. Utilise des backticks pour le code inline. Pas de markdown avec ##, juste du texte clair.`;
  // Contenu utilisateur : inclut le code seulement au premier message ou si changé
  const userContent=code.trim()&&_aiHistory.length===0
    ?`Code actuel dans l'éditeur :\n\`\`\`\n${code.substring(0,2000)}\n\`\`\`\n\nQuestion : ${msg}`
    :msg;
  // Ajoute le message à l'historique
  _aiHistory.push({role:'user',content:userContent});
  // Garde max 10 échanges (20 messages) pour éviter de dépasser les tokens
  if(_aiHistory.length>20)_aiHistory=_aiHistory.slice(-20);
  try{
    const res=await fetch('https://openrouter.ai/api/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`,'HTTP-Referer':'https://devconnect-dev.github.io','X-Title':'DevConnect Editor'},
      body:JSON.stringify({model:'qwen/qwen3-coder:free',models:['qwen/qwen3-coder:free','openrouter/free'],messages:[{role:'system',content:systemPrompt},..._aiHistory],max_tokens:600,temperature:0.3})
    });
    if(!res.ok){
      const err=await res.json().catch(()=>({}));
      if(res.status===401){localStorage.removeItem('dc_openrouter_key');document.getElementById('editor-ai-key-banner').style.display='flex';throw new Error('Clé API invalide — reconfigure-la.');}
      throw new Error(err?.error?.message||`Erreur ${res.status}`);
    }
    const data=await res.json();
    const raw=data?.choices?.[0]?.message?.content||'Pas de réponse.';
    const text=raw.replace(/<pad>/gi,'').replace(/User Safety:\s*\w+/gi,'').replace(/^\s*[\n\r]+/,'').trim();
    // Ajoute la réponse IA à l'historique
    _aiHistory.push({role:'assistant',content:text});
    const el=document.getElementById('ai-typing');
    if(el){el.innerHTML=esc(text).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\n/g,'<br>');el.removeAttribute('id');}
  }catch(e){
    // En cas d'erreur, retire le dernier message user de l'historique
    _aiHistory.pop();
    const el=document.getElementById('ai-typing');
    if(el){el.innerHTML=`<span style="color:#e06a6a">⚠ ${esc(e.message||'Erreur de connexion.')}</span>`;el.removeAttribute('id');}
  }finally{input.disabled=false;input.focus();}
  c.scrollTop=c.scrollHeight;
}

// ADMIN
async function loadAdminData(){
  loadAdminStats();loadAdminUsers();loadAdminTickets();loadAdminLogs();
  loadAdminRecentUsers();loadAdminRecentLogsOverview();loadAdminBottomStats();
  if(currentProfile)setEl('admin-welcome-role',ROLE_LABELS[currentProfile.role]||currentProfile.role||'Admin');
}

function trendHtml(n,label){
  if(n==null)return`<span style="color:var(--text-muted)">—</span>`;
  if(n===0)return`+0 ${label}`;
  return n>0?`▲ +${n} ${label}`:`▼ ${n} ${label}`;
}

async function loadAdminStats(){
  const weekAgo=new Date(Date.now()-7*86400000).toISOString();
  const[u,m,p,t,uWeek,mWeek,pWeek,tWeekClosed]=await Promise.all([
    db.from('profiles').select('id',{count:'exact',head:true}),
    db.from('messages').select('id',{count:'exact',head:true}),
    db.from('profiles').select('id',{count:'exact',head:true}).eq('is_premium',true),
    db.from('report_tickets').select('id',{count:'exact',head:true}).eq('status','open'),
    db.from('profiles').select('id',{count:'exact',head:true}).gte('created_at',weekAgo),
    db.from('messages').select('id',{count:'exact',head:true}).gte('created_at',weekAgo),
    db.from('profiles').select('id',{count:'exact',head:true}).eq('is_premium',true).gte('premium_since',weekAgo),
    db.from('report_tickets').select('id',{count:'exact',head:true}).eq('status','resolved').gte('resolved_at',weekAgo)
  ]);
  setEl('stat-users',u.count??'—');setEl('stat-messages',m.count??'—');setEl('stat-premium',p.count??'—');setEl('stat-tickets',t.count??'—');
  setEl('stat-users-trend',trendHtml(uWeek.count,'cette semaine'));
  setEl('stat-msg-trend',trendHtml(mWeek.count,'cette semaine'));
  setEl('stat-prem-trend',trendHtml(pWeek.count,'cette semaine'));
  setEl('stat-tick-trend',trendHtml(tWeekClosed.count!=null?-tWeekClosed.count:null,'résolus (7j)'));
  document.getElementById('stat-users-trend')?.classList.toggle('down',uWeek.count===0);
  document.getElementById('stat-msg-trend')?.classList.toggle('up',mWeek.count>0);
  setEl('admin-badge-users',u.count??'—');
  setEl('admin-badge-tickets',t.count??'—');
  const tbadge=document.getElementById('admin-badge-tickets');
  if(tbadge)tbadge.style.color=t.count>0?'#d98a8a':'';
}

async function loadAdminRecentUsers(){
  const{data}=await db.from('profiles').select('username,role,created_at').order('created_at',{ascending:false}).limit(6);
  const cont=document.getElementById('admin-recent-users');
  if(!cont)return;
  if(!data||!data.length){cont.innerHTML='<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px;font-size:13px">Aucun utilisateur.</td></tr>';return;}
  cont.innerHTML=data.map(u=>`<tr>
    <td><strong>${esc(u.username||'—')}</strong></td>
    <td style="font-family:var(--font-mono);font-size:11px;color:var(--accent-dim)">${ROLE_LABELS[u.role]||u.role||'—'}</td>
    <td style="color:var(--text-muted);font-size:12px">${timeAgo(u.created_at)}</td>
  </tr>`).join('');
}

async function loadAdminRecentLogsOverview(){
  const cont=document.getElementById('admin-recent-logs');
  if(!cont)return;
  const{data,error}=await db.from('admin_logs').select('*').order('created_at',{ascending:false}).limit(6);
  if(error){console.error('loadAdminRecentLogsOverview:',error);cont.innerHTML='<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:16px">Erreur de chargement des logs.</div>';return;}
  if(!data||!data.length){cont.innerHTML='<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:16px">Aucune activité récente.</div>';return;}
  const adminIds=[...new Set(data.map(l=>l.admin_id).filter(Boolean))];
  let adminMap={};
  if(adminIds.length){
    const{data:profiles}=await db.from('profiles').select('id,username').in('id',adminIds);
    if(profiles)profiles.forEach(p=>{adminMap[p.id]=p.username;});
  }
  cont.innerHTML=data.map(l=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px">
    <span>${esc(l.action||'—')}</span>
    <span style="color:var(--text-muted);font-family:var(--font-mono);font-size:11px;white-space:nowrap">${timeAgo(l.created_at)} · @${esc(adminMap[l.admin_id]||'?')}</span>
  </div>`).join('');
}

async function loadAdminBottomStats(){
  const[posts,xp,certified]=await Promise.all([
    db.from('posts').select('id',{count:'exact',head:true}),
    db.from('profiles').select('xp'),
    db.from('profiles').select('id',{count:'exact',head:true}).eq('is_certified',true)
  ]);
  setEl('stat-posts',posts.count??'—');
  const totalXp=(xp.data||[]).reduce((s,p)=>s+(p.xp||0),0);
  setEl('stat-xp-total',totalXp.toLocaleString('fr-FR'));
  setEl('stat-certified',certified.count??'—');
}

let adminUserPage=0,adminUserSearch='';
async function loadAdminUsers(search=adminUserSearch,append=false){
  adminUserSearch=search;
  if(!append)adminUserPage=0;
  const pageSize=50;
  let q=db.from('profiles').select('id,username,email,specialty,role,is_premium,premium_tier,is_banned,is_certified,is_muted,xp',{count:'exact'}).order('created_at',{ascending:false}).range(adminUserPage*pageSize,adminUserPage*pageSize+pageSize-1);
  if(search)q=q.ilike('username',`%${search}%`);
  const{data,count}=await q;
  const cont=document.getElementById('admin-users-list');
  if(!data||!data.length){
    if(!append)cont.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Aucun utilisateur trouvé.</td></tr>';
    return;
  }
  const rowsHtml=data.map(u=>`<tr>
    <td>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="admin-row-avatar" style="width:28px;height:28px;border-radius:50%;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:11px;font-family:var(--font-mono);color:var(--accent-dim);flex-shrink:0">${esc((u.username||'?')[0].toUpperCase())}</div>
        <div>
          <strong>${esc(u.username||'—')}</strong>${u.is_certified?'<span style="color:#c8c8d8;font-size:11px"> ✦</span>':''}
          <div style="font-size:11px;color:var(--text-muted)">${esc(u.email||'')}</div>
        </div>
      </div>
    </td>
    <td style="font-size:11px;font-family:var(--font-mono);color:var(--accent-dim)">${ROLE_LABELS[u.role]||u.role||'—'}</td>
    <td>${u.premium_tier?`<span class="premium-badge ${u.premium_tier==='devconnect-plus'?'devconnectplus':'devplus'}">${u.premium_tier}</span>`:'<span style="color:var(--text-muted);font-size:12px">—</span>'}</td>
    <td><span class="status-badge ${u.is_banned?'status-open':u.is_muted?'status-claimed':'status-resolved'}">${u.is_banned?'Banni':u.is_muted?'Muté':'Actif'}</span></td>
    <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">${u.xp||0}</td>
    <td>
      <div class="action-btns">
        <button class="btn btn-ghost btn-sm" onclick="banUser('${esc(u.id)}','${esc(u.username)}',${!u.is_banned})">${u.is_banned?'Débannir':'Bannir'}</button>
        <button class="btn btn-ghost btn-sm" style="color:#e05a5a" onclick="deleteUserById('${esc(u.id)}','${esc(u.username)}')">Supprimer</button>
      </div>
    </td>
  </tr>`).join('');
  if(append)cont.innerHTML+=rowsHtml;else cont.innerHTML=rowsHtml;
  const existingBtn=document.getElementById('admin-users-loadmore-row');
  if(existingBtn)existingBtn.remove();
  const hasMore=count!=null&&(adminUserPage+1)*pageSize<count;
  if(hasMore){
    const tr=document.createElement('tr');tr.id='admin-users-loadmore-row';
    tr.innerHTML=`<td colspan="6" style="text-align:center;padding:0"><button class="admin-load-more" style="width:100%;border:none" onclick="adminUserPage++;loadAdminUsers(adminUserSearch,true)">Charger plus d'utilisateurs</button></td>`;
    cont.parentElement.appendChild(tr);
  }
}
function exportAdminUsersCsv(){
  db.from('profiles').select('username,email,specialty,role,is_premium,premium_tier,is_banned,is_muted,is_certified,xp').then(({data})=>{
    if(!data||!data.length){showToast('Aucune donnée à exporter.','error');return;}
    const headers=Object.keys(data[0]);
    const csv=[headers.join(',')].concat(data.map(r=>headers.map(h=>`"${String(r[h]??'').replace(/"/g,'""')}"`).join(','))).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='devconnect_users.csv';a.click();
  });
}

async function deleteUserById(id,username){
  if(!confirm(`⚠️ Supprimer définitivement le compte @${username} ? Cette action est irréversible.`))return;
  const{error}=await db.from('profiles').delete().eq('id',id);
  if(error){showToast('Erreur suppression : '+error.message,'error');return;}
  await writeAdminLog(`Suppression du compte @${username}`,'moderation');
  showToast(`Compte @${username} supprimé.`,'success');
  loadAdminUsers();loadAdminStats();
}

function searchAdminUsers(v){clearTimeout(window._st);window._st=setTimeout(()=>loadAdminUsers(v),300);}

async function banUser(id,username,ban){
  if(!id){
    const{data:found}=await db.from('profiles').select('id').eq('username',username).maybeSingle();
    if(!found){showToast('Utilisateur introuvable.','error');return;}
    id=found.id;
  }
  // Vérif hiérarchie
  const{data:target}=await db.from('profiles').select('role').eq('id',id).maybeSingle();
  if(!checkHierarchy(username, target?.role, 'bannir'))return;
  const{error}=await db.from('profiles').update({is_banned:ban}).eq('id',id);
  if(error){showToast('Erreur : '+error.message,'error');return;}
  await writeAdminLog(ban?`Bannissement de @${username}`:`Débannissement de @${username}`,'moderation');
  showToast(`Utilisateur ${ban?'banni':'débanni'}.`,'success');loadAdminUsers();loadAdminStats();
}

async function grantPremium(){
  const username=getVal('premium-username').trim();
  const tier=getVal('premium-tier-select');
  if(!username){showToast('Entre un pseudo.','error');return;}
  const{data:user}=await db.from('profiles').select('id').eq('username',username).maybeSingle();
  if(!user){showToast('Utilisateur introuvable.','error');return;}
  const updates=tier==='none'?{is_premium:false,premium_tier:null,premium_since:null}:{is_premium:true,premium_tier:tier,premium_since:new Date().toISOString()};
  const{error}=await db.from('profiles').update(updates).eq('id',user.id);
  if(error){showToast('Erreur lors de la mise à jour.','error');return;}
  await writeAdminLog(tier==='none'?`Retrait premium de @${username}`:`Premium ${tier} accordé à @${username}`,'premium');
  showToast(`Premium ${tier==='none'?'retiré':'accordé'} à @${username} !`,'success');
}

// CERTIFICATION
async function toggleCertif(certify){
  const username=getVal('certif-username').trim();
  if(!username){showToast('Entre un pseudo.','error');return;}
  const{data:user}=await db.from('profiles').select('id').eq('username',username).maybeSingle();
  if(!user){showToast('Utilisateur introuvable.','error');return;}
  const{error}=await db.from('profiles').update({is_certified:certify}).eq('id',user.id);
  if(error){showToast('Erreur : '+error.message,'error');return;}
  await writeAdminLog(certify?`Certification accordée à @${username}`:`Certification retirée de @${username}`,'certification');
  showToast(certify?`@${username} est maintenant certifié ✦`:`Certification retirée de @${username}`,'success');
}

// MUTE
async function muteUser(mute){
  const username=getVal('mod-username').trim();
  if(!username){showToast('Entre un pseudo.','error');return;}
  const{data:user}=await db.from('profiles').select('id,role').eq('username',username).maybeSingle();
  if(!user){showToast('Utilisateur introuvable.','error');return;}
  if(!checkHierarchy(username, user.role, 'muter'))return;
  const{error}=await db.from('profiles').update({is_muted:mute}).eq('id',user.id);
  if(error){showToast('Erreur : '+error.message,'error');return;}
  await writeAdminLog(mute?`Mute de @${username}`:`Unmute de @${username}`,'moderation');
  showToast(mute?`@${username} est maintenant muté.`:`@${username} peut à nouveau parler.`,'success');
}

// SUPPRESSION COMPTE (admin)
async function deleteUserAccount(){
  const username=getVal('mod-username').trim();
  if(!username){showToast('Entre un pseudo.','error');return;}
  if(!confirm(`⚠️ Supprimer définitivement le compte @${username} ? Cette action est irréversible.`))return;
  const{data:user}=await db.from('profiles').select('id').eq('username',username).maybeSingle();
  if(!user){showToast('Utilisateur introuvable.','error');return;}
  // Supprimer le profil (les messages/posts resteront anonymisés)
  const{error}=await db.from('profiles').delete().eq('id',user.id);
  if(error){showToast('Erreur suppression profil : '+error.message,'error');return;}
  await writeAdminLog(`Suppression du compte @${username}`,'moderation');
  showToast(`Compte @${username} supprimé.`,'success');
  loadAdminUsers();loadAdminStats();
}

// SUPPRESSION MESSAGE (admin)
async function deleteMessage(msgId){
  if(!confirm('Supprimer ce message ?'))return;
  const{error}=await db.from('messages').delete().eq('id',msgId);
  if(error){showToast('Erreur : '+error.message,'error');return;}
  await writeAdminLog(`Message ${msgId} supprimé`,'moderation');
  showToast('Message supprimé.','success');
  loadMessages();
}

// ── CONTENT MODERATION (admin) ─────────────────────────────────────
async function loadContentMod(){
  // Posts
  const postsTbody=document.getElementById('admin-posts-list');
  if(postsTbody)postsTbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;font-size:13px">Chargement...</td></tr>';
  const{data:posts,error:pe}=await db.from('posts').select('id,content,created_at,user_id').order('created_at',{ascending:false}).limit(30);
  if(pe||!posts){if(postsTbody)postsTbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;font-size:13px">Erreur : '+(pe?.message||'')+'</td></tr>';return;}
  const postUserIds=[...new Set(posts.map(p=>p.user_id))];
  const{data:pu}=postUserIds.length?await db.from('profiles').select('id,username').in('id',postUserIds):{data:[]};
  const puMap=Object.fromEntries((pu||[]).map(u=>[u.id,u]));
  if(postsTbody)postsTbody.innerHTML=posts.map(p=>{
    const u=puMap[p.user_id]||{};
    const snippet=p.content?(p.content.substring(0,60)+(p.content.length>60?'…':'')):'—';
    const dt=new Date(p.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    return`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px 12px;font-size:12px;font-family:var(--font-mono);color:var(--accent-dim)">@${esc(u.username||'?')}</td>
      <td style="padding:10px 12px;font-size:12px;color:var(--text-secondary);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(snippet)}</td>
      <td style="padding:10px 12px;font-size:11px;color:var(--text-muted)">${dt}</td>
      <td style="padding:10px 12px;text-align:right"><button class="btn btn-ghost btn-sm" style="border-color:rgba(200,80,80,.3);color:#e08080;font-size:11px" onclick="adminDeletePost('${p.id}')">Supprimer</button></td>
    </tr>`;
  }).join('');

  // Messages chat (non-DM seulement)
  const msgsTbody=document.getElementById('admin-messages-list');
  if(msgsTbody)msgsTbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;font-size:13px">Chargement...</td></tr>';
  const{data:msgs,error:me}=await db.from('messages').select('id,content,created_at,user_id,channel_id').eq('is_dm',false).order('created_at',{ascending:false}).limit(30);
  if(me||!msgs){if(msgsTbody)msgsTbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;font-size:13px">Erreur : '+(me?.message||'')+'</td></tr>';return;}
  const msgUserIds=[...new Set(msgs.map(m=>m.user_id))];
  const{data:mu}=msgUserIds.length?await db.from('profiles').select('id,username').in('id',msgUserIds):{data:[]};
  const muMap=Object.fromEntries((mu||[]).map(u=>[u.id,u]));
  const chanIds=[...new Set(msgs.map(m=>m.channel_id).filter(Boolean))];
  const{data:chans}=chanIds.length?await db.from('channels').select('id,name').in('id',chanIds):{data:[]};
  const chanMap=Object.fromEntries((chans||[]).map(c=>[c.id,c]));
  if(msgsTbody)msgsTbody.innerHTML=msgs.map(m=>{
    const u=muMap[m.user_id]||{};
    const chan=chanMap[m.channel_id]||{};
    const snippet=m.content?(m.content.substring(0,60)+(m.content.length>60?'…':'')):'—';
    return`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px 12px;font-size:12px;font-family:var(--font-mono);color:var(--accent-dim)">@${esc(u.username||'?')}</td>
      <td style="padding:10px 12px;font-size:12px;color:var(--text-secondary);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(snippet)}</td>
      <td style="padding:10px 12px;font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">#${esc(chan.name||'?')}</td>
      <td style="padding:10px 12px;text-align:right"><button class="btn btn-ghost btn-sm" style="border-color:rgba(200,80,80,.3);color:#e08080;font-size:11px" onclick="adminDeleteMsg('${m.id}')">Supprimer</button></td>
    </tr>`;
  }).join('');
}
async function adminDeletePost(id){
  if(!confirm('Supprimer ce post définitivement ?'))return;
  const{error}=await db.from('posts').delete().eq('id',id);
  if(error){showToast('Erreur : '+error.message,'error');return;}
  await writeAdminLog(`Post ${id} supprimé (modération contenu)`,'moderation');
  showToast('Post supprimé.','success');
  loadContentMod();
}
async function adminDeleteMsg(id){
  if(!confirm('Supprimer ce message définitivement ?'))return;
  const{error}=await db.from('messages').delete().eq('id',id);
  if(error){showToast('Erreur : '+error.message,'error');return;}
  await writeAdminLog(`Message chat ${id} supprimé (modération contenu)`,'moderation');
  showToast('Message supprimé.','success');
  loadContentMod();
}

async function assignRole(){
  const username=getVal('role-username').trim();
  const role=getVal('role-select');
  const modoRoles=['responsable_modo','moderator_senior','moderator','moderator_junior','community_manager','content_manager','staff'];
  if(!username){showToast('Entre un pseudo.','error');return;}
  if(!modoRoles.includes(role)){showToast('Rôle invalide pour ce panel.','error');return;}
  const myLevel=getRoleLevel(currentProfile?.role);
  const targetLevel=getRoleLevel(role);
  if(targetLevel>=myLevel&&currentProfile?.role!=='architect'){
    showToast(`Tu ne peux pas attribuer un rôle supérieur ou égal au tien.`,'error');return;
  }
  const{data:user}=await db.from('profiles').select('id,role').eq('username',username).maybeSingle();
  if(!user){showToast('Utilisateur introuvable.','error');return;}
  if(!checkHierarchy(username, user.role, 'modifier le rôle de'))return;
  const{error}=await db.from('profiles').update({role}).eq('id',user.id);
  if(error){showToast('Erreur lors de la mise à jour.','error');return;}
  await writeAdminLog(`Rôle "${ROLE_LABELS[role]||role}" attribué à @${username}`,'role');
  showToast(`Rôle "${ROLE_LABELS[role]||role}" attribué à @${username} !`,'success');
}
  const{data:user}=await db.from('profiles').select('id,role').eq('username',username).maybeSingle();
  if(!user){showToast('Utilisateur introuvable.','error');return;}
  // Vérif : ne peut pas agir sur un user de rang >= au sien
  if(!checkHierarchy(username, user.role, 'modifier le rôle de'))return;
  const{error}=await db.from('profiles').update({role}).eq('id',user.id);
  if(error){showToast('Erreur lors de la mise à jour.','error');return;}
  await writeAdminLog(`Rôle "${ROLE_LABELS[role]||role}" attribué à @${username}`,'role');
  showToast(`Rôle "${ROLE_LABELS[role]||role}" attribué à @${username} !`,'success');
}

// TICKETS DE MODÉRATION (vrais)
let _ticketFilter='open';
function filterTickets(el,status){
  document.querySelectorAll('#admin-tickets .filter-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  _ticketFilter=status;
  loadAdminTickets();
}
async function loadAdminTickets(){
  const cont=document.getElementById('admin-tickets-list');
  let q=db.from('report_tickets').select('*').order('created_at',{ascending:false}).limit(30);
  if(_ticketFilter!=='all')q=q.eq('status',_ticketFilter);
  const{data,error}=await q;
  if(error){console.error('loadAdminTickets:',error);}
  if(!data||data.length===0){
    cont.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Aucun ticket pour l\'instant.</td></tr>';
    return;
  }
  const userIds=[...new Set([...data.map(t=>t.reporter_id),...data.map(t=>t.target_id)].filter(Boolean))];
  let userMap={};
  if(userIds.length){
    const{data:profiles}=await db.from('profiles').select('id,username').in('id',userIds);
    if(profiles)profiles.forEach(p=>{userMap[p.id]=p.username;});
  }
  const statusClass={open:'status-open',claimed:'status-claimed',resolved:'status-resolved',dismissed:'status-resolved'};
  cont.innerHTML=data.map(t=>`<tr>
    <td><strong style="font-size:13px">${esc(t.reason||'—')}</strong><div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono)">${esc(t.category||'—')} · ${esc(t.priority||'—')}</div></td>
    <td style="font-size:12px">@${esc(userMap[t.reporter_id]||'?')}</td>
    <td style="font-size:12px">@${esc(userMap[t.target_id]||'?')}</td>
    <td><span class="status-badge ${statusClass[t.status]||'status-open'}">${t.status}</span></td>
    <td>
      <div class="action-btns">
        ${t.status==='open'?`<button class="btn btn-ghost btn-sm" onclick="claimTicket('${t.id}')">Prendre</button>`:''}
        ${t.status!=='resolved'&&t.status!=='dismissed'?`<button class="btn btn-ghost btn-sm" onclick="resolveTicket('${t.id}')">Résoudre</button>`:''}
        ${t.status!=='dismissed'&&t.status!=='resolved'?`<button class="btn btn-ghost btn-sm" style="color:var(--text-muted)" onclick="dismissTicket('${t.id}')">Rejeter</button>`:''}
      </div>
    </td>
  </tr>`).join('');
}

async function claimTicket(id){
  const{data:ticket,error:ticketErr}=await db.from('report_tickets').select('*').eq('id',id).maybeSingle();
  if(ticketErr||!ticket){showToast('Erreur : ticket introuvable.','error');return;}
  const{error}=await db.from('report_tickets').update({status:'claimed',claimed_by:currentUser.id}).eq('id',id);
  if(error){showToast('Erreur : '+error.message,'error');return;}
  await writeAdminLog(`Ticket ${id} pris en charge`,'moderation');
  showToast('Ticket pris en charge.','info');
  loadAdminTickets();loadAdminStats();
  await openTicketVerificationDm(ticket);
}

// Ouvre une conversation privée avec la personne qui a signalé, pour vérification (preuves, détails...)
async function openTicketVerificationDm(ticket){
  if(!currentUser||!ticket?.reporter_id)return;
  if(ticket.reporter_id===currentUser.id){showToast("Tu es à l'origine de ce signalement, impossible d'ouvrir une conversation avec toi-même.",'error');return;}
  const[{data:reporterProfile},{data:targetProfile}]=await Promise.all([
    db.from('profiles').select('username').eq('id',ticket.reporter_id).maybeSingle(),
    ticket.target_id?db.from('profiles').select('username').eq('id',ticket.target_id).maybeSingle():Promise.resolve({data:null})
  ]);
  const reporterName=reporterProfile?.username||'utilisateur';
  const targetName=targetProfile?.username||'?';
  let convId=null;
  const{data:c1}=await db.from('dm_conversations').select('id').eq('user1_id',currentUser.id).eq('user2_id',ticket.reporter_id).maybeSingle();
  const{data:c2}=await db.from('dm_conversations').select('id').eq('user1_id',ticket.reporter_id).eq('user2_id',currentUser.id).maybeSingle();
  if(c1)convId=c1.id;
  else if(c2)convId=c2.id;
  else{
    const{data:newConv,error}=await db.from('dm_conversations').insert({user1_id:currentUser.id,user2_id:ticket.reporter_id}).select().maybeSingle();
    if(error){showToast("Erreur lors de l'ouverture de la conversation : "+error.message,'error');return;}
    convId=newConv.id;
  }
  navigate('messages');
  await loadDmList();
  await openDmConv(convId,reporterName);
  const input=document.getElementById('chat-input');
  if(input){
    input.value=`Bonjour ! Je m'occupe de ton signalement contre @${targetName} (catégorie : ${ticket.category||'—'}). Peux-tu me donner plus de détails ou des preuves (captures d'écran, liens, messages...) pour qu'on puisse vérifier ça ensemble ? 🔍`;
    input.focus();
  }
  showToast(`Conversation ouverte avec @${reporterName} pour vérification.`,'success');
}

async function resolveTicket(id){
  await db.from('report_tickets').update({status:'resolved',resolved_at:new Date().toISOString()}).eq('id',id);
  await writeAdminLog(`Ticket ${id} résolu`,'moderation');
  showToast('Ticket résolu.','success');loadAdminTickets();loadAdminStats();
}

async function dismissTicket(id){
  await db.from('report_tickets').update({status:'dismissed',resolved_at:new Date().toISOString()}).eq('id',id);
  await writeAdminLog(`Ticket ${id} rejeté`,'moderation');
  showToast('Ticket rejeté.','info');loadAdminTickets();loadAdminStats();
}

// LOGS ADMIN (vrais)
async function loadAdminLogs(){
  const cont=document.getElementById('admin-logs-list');
  const{data,error}=await db.from('admin_logs').select('*').order('created_at',{ascending:false}).limit(30);
  if(error){console.error('loadAdminLogs:',error);if(cont)cont.innerHTML=`<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Erreur : ${esc(error.message)}</div>`;return;}
  if(!data||data.length===0){
    cont.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Aucun log pour l\'instant.</div>';
    return;
  }
  const adminIds=[...new Set(data.map(l=>l.admin_id).filter(Boolean))];
  let adminMap={};
  if(adminIds.length){
    const{data:profiles}=await db.from('profiles').select('id,username').in('id',adminIds);
    if(profiles)profiles.forEach(p=>{adminMap[p.id]=p.username;});
  }
  cont.innerHTML=data.map(l=>`<div class="admin-table-row" style="grid-template-columns:1fr 120px 140px">
    <div style="font-size:13px">${esc(l.action||'—')}</div>
    <div style="font-size:11px;font-family:var(--font-mono);color:var(--accent-dim)">${esc(l.category||'—')}</div>
    <div style="font-size:11px;font-family:var(--font-mono);color:var(--text-muted)">${timeAgo(l.created_at)} · @${esc(adminMap[l.admin_id]||'?')}</div>
  </div>`).join('');
}

async function createAnnouncement(){
  const text=getVal('announce-text').trim();
  if(!text){showToast('Écris un message.','error');return;}
  const{error}=await db.from('announcements').insert({content:text,created_by:currentUser.id,active:true});
  if(error){showToast('Erreur : '+error.message,'error');return;}
  setVal('announce-text','');
  await writeAdminLog('Nouvelle annonce publiée','general');
  showToast('Annonce publiée !','success');
  loadAdminAnnouncements();
}
async function loadAdminAnnouncements(){
  const cont=document.getElementById('admin-announce-list');
  if(!cont)return;
  const{data,error}=await db.from('announcements').select('*,author:profiles!announcements_created_by_fkey(username)').order('created_at',{ascending:false}).limit(20);
  if(error){cont.innerHTML='<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:16px">Table "announcements" introuvable — crée-la dans Supabase.</div>';return;}
  if(!data||!data.length){cont.innerHTML='<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:16px">Aucune annonce pour l\'instant.</div>';return;}
  cont.innerHTML=data.map(a=>`<div class="announcement-item ${a.active?'':'inactive'}">
    <div>
      <div style="font-size:13px">${esc(a.content)}</div>
      <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);margin-top:4px">${a.active?'Active':'Désactivée'} · ${timeAgo(a.created_at)} · @${esc(a.author?.username||'?')}</div>
    </div>
    <div class="action-btns">
      <button class="btn btn-ghost btn-sm" onclick="toggleAnnouncement('${a.id}',${!a.active})">${a.active?'Désactiver':'Réactiver'}</button>
      <button class="btn btn-ghost btn-sm" style="color:#e05a5a" onclick="deleteAnnouncement('${a.id}')">Supprimer</button>
    </div>
  </div>`).join('');
}
async function toggleAnnouncement(id,active){
  await db.from('announcements').update({active}).eq('id',id);
  loadAdminAnnouncements();
}
async function deleteAnnouncement(id){
  if(!confirm('Supprimer cette annonce ?'))return;
  await db.from('announcements').delete().eq('id',id);
  loadAdminAnnouncements();
}
async function loadActiveAnnouncementBanner(){
  const slot=document.getElementById('feed-banner-slot');
  if(!slot)return;
  const{data}=await db.from('announcements').select('*').eq('active',true).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(!data||localStorage.getItem('dc_dismissed_announce')===data.id){slot.innerHTML='';return;}
  slot.innerHTML=`<div class="feed-banner"><span class="feed-banner-icon">📣</span><div class="feed-banner-text">${esc(data.content)}</div><button class="feed-banner-close" onclick="dismissAnnouncementBanner('${data.id}')">×</button></div>`;
}
function dismissAnnouncementBanner(id){
  localStorage.setItem('dc_dismissed_announce',id);
  document.getElementById('feed-banner-slot').innerHTML='';
}
async function writeAdminLog(action,category='general'){
  if(!currentUser)return;
  await db.from('admin_logs').insert({admin_id:currentUser.id,action,category});
}

function switchAdmin(el,section){
  document.querySelectorAll('.admin-nav-item').forEach(n=>n.classList.remove('active'));el.classList.add('active');
  document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));
  document.getElementById('admin-'+section)?.classList.add('active');
  if(section==='users')loadAdminUsers();
}

// SETTINGS & TABS
function switchSettings(el,s){document.querySelectorAll('.settings-nav-item').forEach(n=>n.classList.remove('active'));el.classList.add('active');document.querySelectorAll('.settings-section').forEach(x=>x.classList.remove('active'));document.getElementById('settings-'+s)?.classList.add('active');if(s==='premium-s')updatePremiumStatus();}
function switchProfileTab(tab,el){document.querySelectorAll('.profile-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');document.querySelectorAll('.profile-tab-content').forEach(c=>c.classList.remove('active'));document.getElementById('tab-'+tab)?.classList.add('active');}

// SEARCH
function openSearch() {
  document.getElementById('search-modal').classList.add('show');
  setTimeout(() => {
    const inp = document.getElementById('search-main-input');
    inp.focus();
    inp.oninput = (e) => runSearch(e.target.value);
  }, 50);
}
function closeSearch() { document.getElementById('search-modal').classList.remove('show'); }

async function runSearch(q) {
  const cont = document.getElementById('search-results');
  if (!q || q.trim().length < 2) {
    cont.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;font-family:var(--font-mono)">Tape pour rechercher...</div>';
    return;
  }
  const term = q.trim();
  // Recherche en parallèle : profils + channels statiques + challenges
  const { data: profiles } = await db.from('profiles').select('username,specialty,avatar_url').ilike('username', `%${term}%`).eq('is_banned', false).limit(6);
  const specLabels = { web_dev: 'Dev Web', mobile_dev: 'Mobile', backend_dev: 'Backend', fullstack_dev: 'Fullstack', cybersecurity: 'Cybersec', devops: 'DevOps', data: 'Data', ai_ml: 'IA/ML', designer_ux: 'Design', recruiter: 'Recruteur' };
  const channels = ['général', 'aide', 'projets', 'showcase', 'cybersec', 'devops', 'data-ia'].filter(c => c.includes(term.toLowerCase()));
  const challengeList = [
    { title: "SQL Injection — Bypass", id: 'sql-injection', diff: 'Hard' },
    { title: "React — Optimisation de rendu", id: 'react-perf', diff: 'Moyen' },
    { title: "Docker — Container Escape", id: 'docker-escape', diff: 'Extrême' },
    { title: "Algorithme — Tri en O(n log n)", id: 'algo-sort', diff: 'Facile' }
  ].filter(c => c.title.toLowerCase().includes(term.toLowerCase()));

  let html = '';
  (profiles || []).forEach(u => {
    const init = (u.username || '').substring(0, 2).toUpperCase();
    const avatarH = u.avatar_url ? `<img src="${esc(u.avatar_url)}" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover">` : `<span style="font-family:var(--font-mono);font-size:11px">${init}</span>`;
    html += `<div class="search-result-item" onclick="navigate('discover');closeSearch()"><span class="search-result-icon">${avatarH}</span><div><div class="search-result-name">${esc(u.username)}</div><div class="search-result-type">profil · ${esc(specLabels[u.specialty] || u.specialty || '—')}</div></div></div>`;
  });
  channels.forEach(c => {
    html += `<div class="search-result-item" onclick="navigate('messages');closeSearch()"><span class="search-result-icon">#</span><div><div class="search-result-name">#${c}</div><div class="search-result-type">channel</div></div></div>`;
  });
  challengeList.forEach(c => {
    html += `<div class="search-result-item" onclick="navigate('learn');openChallenge('${c.id}');closeSearch()"><span class="search-result-icon">◆</span><div><div class="search-result-name">${esc(c.title)}</div><div class="search-result-type">challenge · ${c.diff}</div></div></div>`;
  });
  if (!html) html = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;font-family:var(--font-mono)">Aucun résultat.</div>';
  cont.innerHTML = html;
}

// DROPDOWN
function toggleProfileDropdown(){document.getElementById('profile-dropdown').classList.toggle('show');}

// ============================================================
// NOTIFICATIONS
// ============================================================

const NOTIF_ICONS={mention:'@',dm:'✉',follow:'★',like:'♥',report:'⚠'};
function toggleNotifDropdown(){
  const dd=document.getElementById('notif-dropdown');
  dd.classList.toggle('show');
  if(dd.classList.contains('show'))loadNotifications();
}
async function loadNotifications(){
  if(!currentUser)return;
  const{data,error}=await db.from('notifications').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(25);
  const list=document.getElementById('notif-list');
  if(error){list.innerHTML='<div style="padding:18px 8px;text-align:center;font-size:12px;color:var(--text-muted)">Erreur de chargement.</div>';return;}
  if(!data||data.length===0){list.innerHTML='<div style="padding:18px 8px;text-align:center;font-size:12px;color:var(--text-muted)">Aucune notification pour l\'instant.</div>';return;}
  list.innerHTML=data.map(n=>`
    <div class="dropdown-item" style="align-items:flex-start;${n.is_read?'opacity:.55':''}" onclick="openNotif('${esc(n.id)}','${esc(n.link||'')}')">
      <span style="width:22px;height:22px;border-radius:50%;background:var(--bg2);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px">${NOTIF_ICONS[n.type]||'●'}</span>
      <div style="flex:1">
        <div style="font-size:12px;color:var(--text)">${esc(n.content)}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${timeAgo(n.created_at)}</div>
      </div>
    </div>`).join('');
  updateNotifBadge();
}
async function updateNotifBadge(){
  if(!currentUser)return;
  const{count,error}=await db.from('notifications').select('*',{count:'exact',head:true}).eq('user_id',currentUser.id).eq('is_read',false);
  const badge=document.getElementById('notif-badge');
  if(badge)badge.style.display=(!error&&count>0)?'block':'none';
}
async function openNotif(id,link){
  await db.from('notifications').update({is_read:true}).eq('id',id);
  document.getElementById('notif-dropdown').classList.remove('show');
  updateNotifBadge();
  if(link)navigate(link);
}
async function markAllNotifsRead(){
  if(!currentUser)return;
  await db.from('notifications').update({is_read:true}).eq('user_id',currentUser.id).eq('is_read',false);
  loadNotifications();
}
async function notifyUser(userId,type,content,link){
  if(!userId||userId===currentUser?.id)return;
  const{error}=await db.from('notifications').insert({user_id:userId,type,content,link,is_read:false});
  if(error)console.error('notifyUser:',error);
}
function subscribeNotifications(){
  if(!currentUser)return;
  db.channel('notifications-'+currentUser.id)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+currentUser.id},()=>{
      updateNotifBadge();
      if(document.getElementById('notif-dropdown').classList.contains('show'))loadNotifications();
    }).subscribe();
}
let dmListRealtimeSub=null;
function subscribeDmListRealtime(){
  if(!currentUser)return;
  if(dmListRealtimeSub)db.removeChannel(dmListRealtimeSub);
  dmListRealtimeSub=db.channel('dm-list-'+currentUser.id)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'dm_conversations',filter:`user2_id=eq.${currentUser.id}`},()=>{
      if(currentSection==='messages')loadDmList();
    })
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'is_dm=eq.true'},()=>{
      if(currentSection==='messages')loadDmList();
    })
    .subscribe();
}
document.addEventListener('click',e=>{const dd=document.getElementById('profile-dropdown');if(dd&&!e.target.closest('.topnav-right'))dd.classList.remove('show');});

// TOAST
function showToast(msg,type='info'){const c=document.getElementById('toast-container');const t=document.createElement('div');t.className=`toast ${type}`;t.textContent=msg;c.appendChild(t);setTimeout(()=>t.remove(),3500);}

// UTILS
function setEl(id,v){const el=document.getElementById(id);if(el)el.textContent=v;}
function setVal(id,v){const el=document.getElementById(id);if(el)el.value=v;}
function getVal(id){return document.getElementById(id)?.value||'';}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}
// Bloque les URLs javascript: data: vbscript: (XSS via href)
function safeUrl(url){
  if(!url)return'';
  const u=String(url).trim().toLowerCase();
  if(u.startsWith('javascript:')||u.startsWith('data:')||u.startsWith('vbscript:')||u.startsWith('blob:')||u.startsWith('//')){
    logSecurityEvent('unsafe_url_blocked',{url:String(url).substring(0,200)});
    return'';
  }
  return url;
}

async function logSecurityEvent(eventType,details={}){
  if(!currentUser)return;
  try{
    await db.from('security_logs').insert({
      user_id:currentUser.id,
      event_type:eventType,
      details:details
    });
  }catch(e){/* silencieux */}
}
// Valide qu'une couleur CSS est inoffensive (hex, rgb, hsl, var() seulement)
function safeCssColor(val){if(!val)return'';const v=String(val).trim();if(/^#[0-9a-fA-F]{3,8}$/.test(v))return v;if(/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(v))return v;if(/^hsl\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*\)$/.test(v))return v;if(/^var\(--[\w-]+\)$/.test(v))return v;return'';}

/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                   DEVCONNECT — PROPRIÉTÉ                     ║
 * ║         © 2026 Cover (Cover.dev) — Tous droits réservés      ║
 * ║   Toute copie, reproduction ou distribution est interdite    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Créateur  : Cover / Cover.dev
 * Projet    : DevConnect — Plateforme communautaire pour devs
 * Version   : DC-2026-v2.0
 * Build     : 2026-06-22T21:41:35
 *
 * 
 * TRIGGER SQL HIÉRARCHIE À APPLIQUER DANS SUPABASE :
 * La fonction prevent_privilege_escalation() gère déjà une partie
 * de la protection. Le contrôle hiérarchique complet est géré côté JS.
 *
 * Empreinte SHA-256 (preuve de création horodatée) :
 * f3b0e9ceda5fc9df8c563d24851f6ae79b7003aaf476fd62ba8bbe1d9fddb498
 *
 * Ce code source est la propriété intellectuelle exclusive de son
 * créateur. Aucune utilisation, copie, modification ou distribution
 * n'est autorisée sans accord écrit préalable.
 */