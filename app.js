(() => {
const cfg=window.OSCADIA_BLOG_CONFIG||{}, $=id=>document.getElementById(id);
const S={db:null,user:null,profile:null,route:null,selectedFiles:[],likes:new Set()};
const E={notice:$("notice"),auth:$("authPanel"),write:$("composer"),profile:$("profilePanel"),post:$("postPanel"),feedPanel:$("feedPanel"),feed:$("feed"),label:$("userLabel"),authButton:$("authButton"),myProfile:$("myProfile")};
const configured=cfg.supabaseUrl&&!cfg.supabaseUrl.includes("PASTE_")&&cfg.supabaseAnonKey&&!cfg.supabaseAnonKey.includes("PASTE_");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl=s=>{try{let u=new URL(s);return u.protocol==="https:"||u.protocol==="http:"?u.href:null}catch{return null}};
function notice(s,error=false){E.notice.textContent=s;E.notice.classList.toggle("error",error);E.notice.hidden=false}
function clearNotice(){E.notice.hidden=true;E.notice.textContent=""}
function only(which){[E.auth,E.write,E.profile,E.post].forEach(x=>x.hidden=true);E.feedPanel.hidden=which!=="feed";if(which==="auth")E.auth.hidden=false;if(which==="write")E.write.hidden=false;if(which==="profile")E.profile.hidden=false;if(which==="post")E.post.hidden=false}
function badge(p){if(p?.badge_type==="official")return '<span class="badge official">✓ 공식</span>';if(p?.badge_type==="personal"&&p?.badge_approved)return '<span class="badge personal">✓ 인증</span>';return ""}
function avatar(p,large=false){let cls="avatar"+(large?" large":"");if(p?.avatar_url&&safeUrl(p.avatar_url))return `<img class="${cls}" src="${esc(p.avatar_url)}" alt="">`;return `<span class="${cls}">${esc((p?.display_name||p?.username||"?").slice(0,1).toUpperCase())}</span>`}
function author(p){let u=p?.username||"user";return `<a class="author" href="/profiles/${encodeURIComponent(u)}">${esc(p?.display_name||u)}</a> ${badge(p)}`}
function date(s){return new Date(s).toLocaleString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}
function shortId(id){return String(id).replaceAll("-","").slice(0,8)}
function hrefPost(p){return `/post/${encodeURIComponent(p.username||p.profiles?.username||"user")}/${new Date(p.created_at).toISOString().slice(0,10).replaceAll("-","")}-${shortId(p.id)}`}
function route(){let saved=sessionStorage.getItem("oscadia_blog_route");if(saved){sessionStorage.removeItem("oscadia_blog_route");history.replaceState({}, "", saved)}let p=decodeURI(location.pathname).split("/").filter(Boolean);if(p[0]==="profiles"&&p[1])return{type:"profile",username:p[1]};if(p[0]==="post"&&p[1]&&p[2])return{type:"post",username:p[1],slug:p[2]};if(p[0]==="write")return{type:"write"};if(p[0]==="login")return{type:"auth"};return{type:"feed"}}
function go(path){history.pushState({}, "",path);S.route=route();renderRoute();scrollTo(0,0)}
function renderBody(raw=""){
  // Supported inline syntax: ![alt](url), [text](url), {{video:url}}, and plain URLs.
  let re=/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)|\{\{video:(https?:\/\/[^}\s]+)\}\}|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s]+)/g;
  let out="",last=0,m;
  while((m=re.exec(raw))!==null){
    out+=esc(raw.slice(last,m.index)).replace(/\n/g,"<br>");
    if(m[1]!==undefined){let u=safeUrl(m[2]);out+=u?`<img src="${esc(u)}" alt="${esc(m[1])}" loading="lazy">`:esc(m[0]);}
    else if(m[3]!==undefined){let u=safeUrl(m[3]);if(u){let yt=u.match(/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);if(yt)out+=`<div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${esc(yt[1])}" title="YouTube video" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;else out+=`<video src="${esc(u)}" controls preload="metadata"></video>`;}else out+=esc(m[0]);}
    else if(m[4]!==undefined){let u=safeUrl(m[5]);out+=u?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(m[4])}</a>`:esc(m[0]);}
    else {let u=safeUrl(m[6]);out+=u?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`:esc(m[0]);}
    last=re.lastIndex;
  }
  out+=esc(raw.slice(last)).replace(/\n/g,"<br>");return out;
}
async function ensureProfile(user){
 let {data,error}=await S.db.from("blog_profiles").select("*").eq("id",user.id).maybeSingle();if(error)throw error;if(data){S.profile=data;return data}
 let base=(user.email||"user").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,18)||"user";if(base.length<3)base="user";let name=base;
 for(let i=1;i<50;i++){let r=await S.db.from("blog_profiles").select("id").eq("username",name).maybeSingle();if(!r.data)break;name=base.slice(0,15)+"_"+i}
 let r=await S.db.from("blog_profiles").insert({id:user.id,username:name,display_name:base,bio:""}).select().single();if(r.error)throw r.error;S.profile=r.data;return r.data
}
async function session(){let {data:{session}}=await S.db.auth.getSession();S.user=session?.user||null;S.profile=null;if(S.user){try{await ensureProfile(S.user)}catch(e){console.error(e);notice("프로필 준비 오류: "+e.message,true)}}updateAccount()}
function updateAccount(){E.label.textContent=S.user?(S.profile?.display_name||S.user.email):"로그아웃 상태";E.authButton.textContent=S.user?"로그아웃":"로그인";E.myProfile.hidden=!S.profile;if(S.profile)E.myProfile.href="/profiles/"+encodeURIComponent(S.profile.username)}
async function counts(profileId){let [f1,f2]=await Promise.all([S.db.from("blog_follows").select("*",{count:"exact",head:true}).eq("followed_id",profileId),S.db.from("blog_follows").select("*",{count:"exact",head:true}).eq("follower_id",profileId)]);return{followers:f1.count||0,following:f2.count||0}}
async function isFollowing(id){if(!S.user)return false;let {data}=await S.db.from("blog_follows").select("followed_id").eq("follower_id",S.user.id).eq("followed_id",id).maybeSingle();return !!data}
async function followToggle(id){if(!S.user){notice("팔로우하려면 로그인하세요.");go("/login");return}if(id===S.user.id)return;let {data}=await S.db.from("blog_follows").select("followed_id").eq("follower_id",S.user.id).eq("followed_id",id).maybeSingle();let r=data?await S.db.from("blog_follows").delete().eq("follower_id",S.user.id).eq("followed_id",id):await S.db.from("blog_follows").insert({follower_id:S.user.id,followed_id:id});if(r.error){notice(r.error.message,true);return}if(S.route.type==="profile")loadProfile(S.route.username)}
async function loadPosts(search=""){
 E.feed.innerHTML='<div class="loading">게시글을 불러오는 중…</div>';
 let q=S.db.from("blog_posts").select("*, profiles:blog_profiles!blog_posts_author_id_fkey(id,username,display_name,avatar_url,badge_type,badge_approved)").order("created_at",{ascending:false}).limit(50);
 if(search)q=q.or(`title.ilike.%${search.replace(/[(),]/g," ")}%,body.ilike.%${search.replace(/[(),]/g," ")}%`);
 let {data,error}=await q;if(error){E.feed.innerHTML=`<div class="empty">${esc(error.message)}</div>`;return}
 let posts=data||[];if(!posts.length){E.feed.innerHTML='<div class="empty">아직 게시글이 없습니다. 첫 글을 남겨 보세요.</div>';return}
 if(S.user){let r=await S.db.from("blog_likes").select("post_id").in("post_id",posts.map(p=>p.id)).eq("user_id",S.user.id);S.likes=new Set((r.data||[]).map(x=>x.post_id))}
 let comments=await S.db.from("blog_comments").select("post_id").in("post_id",posts.map(p=>p.id));let cc={};(comments.data||[]).forEach(c=>cc[c.post_id]=(cc[c.post_id]||0)+1);
 E.feed.innerHTML=posts.map(p=>card(p,cc[p.id]||0)).join("");posts.forEach(p=>likeCount(p.id).then(n=>{let x=document.querySelector(`[data-like-count="${p.id}"]`);if(x)x.textContent=n}))
}
function card(p,commentCount=0){let pr=p.profiles||{};return `<article class="post-card"><div class="post-meta">${avatar(pr)}<div>${author(pr)}<div>${date(p.created_at)}</div></div></div><a href="${hrefPost({...p,username:pr.username})}" class="post-title" style="display:block">${esc(p.title)}</a><div class="post-body">${renderBody((p.body||"").slice(0,700))}${p.body?.length>700?"…":""}</div><div class="post-actions"><button data-like="${p.id}" class="${S.likes.has(p.id)?"liked":""}">${S.likes.has(p.id)?"♥":"♡"} 좋아요 <span data-like-count="${p.id}">…</span></button><a href="${hrefPost({...p,username:pr.username})}#comments">댓글 ${commentCount}</a><a href="${hrefPost({...p,username:pr.username})}">자세히 보기</a></div></article>`}
async function likeCount(id){let {count,error}=await S.db.from("blog_likes").select("*",{count:"exact",head:true}).eq("post_id",id);return error?0:count||0}
async function toggleLike(id){if(!S.user){notice("좋아요를 누르려면 로그인하세요.");go("/login");return}let {data}=await S.db.from("blog_likes").select("post_id").eq("post_id",id).eq("user_id",S.user.id).maybeSingle();let r=data?await S.db.from("blog_likes").delete().eq("post_id",id).eq("user_id",S.user.id):await S.db.from("blog_likes").insert({post_id:id,user_id:S.user.id});if(r.error){notice(r.error.message,true);return}renderRoute()}
async function loadProfile(username){
 only("profile");E.profile.innerHTML='<div class="loading">프로필을 불러오는 중…</div>';
 let {data:p,error}=await S.db.from("blog_profiles").select("*").eq("username",username).maybeSingle();if(error||!p){E.profile.innerHTML='<div class="empty">프로필을 찾을 수 없습니다.</div>';return}
 let c=await counts(p.id),following=S.user&&S.user.id!==p.id?await isFollowing(p.id):false;
 let posts=await S.db.from("blog_posts").select("*, profiles:blog_profiles!blog_posts_author_id_fkey(id,username,display_name,avatar_url,badge_type,badge_approved)").eq("author_id",p.id).order("created_at",{ascending:false}).limit(50);
 E.profile.innerHTML=`<div class="profile-header">${avatar(p,true)}<div><div class="profile-name">${esc(p.display_name)} ${badge(p)}</div><div class="muted">@${esc(p.username)}</div><div class="profile-bio">${esc(p.bio||"아직 소개가 없습니다.")}</div><div class="count-row"><span><strong>${c.followers}</strong> 팔로어</span><span><strong>${c.following}</strong> 팔로잉</span></div></div></div>
 <div class="profile-controls">${S.user&&S.user.id!==p.id?`<button id="followBtn" class="${following?"secondary":"primary"}">${following?"팔로우 취소":"팔로우"}</button>`:""}${S.user?.id===p.id?'<button id="editProfile" class="secondary">프로필 수정</button><label class="file-button">프로필 사진 변경<input id="avatarFile" type="file" accept="image/*" hidden></label>':""}</div>
 <h2 style="font-size:17px;margin-top:28px">게시글</h2><div class="feed">${(posts.data||[]).length?(posts.data||[]).map(x=>card(x)).join(""):'<div class="empty">작성한 게시글이 없습니다.</div>'}</div>`;
 let fb=$("followBtn");if(fb)fb.onclick=()=>followToggle(p.id);
 let eb=$("editProfile");if(eb)eb.onclick=async()=>{let n=prompt("표시 이름",p.display_name);if(n===null)return;let b=prompt("소개",p.bio||"");if(b===null)return;let r=await S.db.from("blog_profiles").update({display_name:n.trim().slice(0,60),bio:b.slice(0,500)}).eq("id",S.user.id);if(r.error)notice(r.error.message,true);else{await session();loadProfile(p.username)}};
 let af=$("avatarFile");if(af)af.onchange=()=>uploadAvatar(af.files[0],p);
 E.profile.querySelectorAll("[data-like]").forEach(b=>b.onclick=()=>toggleLike(b.dataset.like));
 (posts.data||[]).forEach(x=>likeCount(x.id).then(n=>{let node=E.profile.querySelector(`[data-like-count="${x.id}"]`);if(node)node.textContent=n}))
}
async function uploadAvatar(file,p){if(!file)return;if(!file.type.startsWith("image/")||file.size>5*1024*1024){notice("프로필 사진은 이미지 파일, 최대 5MB까지 가능합니다.",true);return}let ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"").slice(0,8)||"jpg";let path=`${S.user.id}/avatar/${crypto.randomUUID()}.${ext}`;let up=await S.db.storage.from("blog-attachments").upload(path,file,{upsert:false,contentType:file.type});if(up.error){notice(up.error.message,true);return}let {data}=S.db.storage.from("blog-attachments").getPublicUrl(path);let r=await S.db.from("blog_profiles").update({avatar_url:data.publicUrl}).eq("id",S.user.id);if(r.error){notice(r.error.message,true);return}await session();loadProfile(p.username)}
async function loadPost(username,slug){
 only("post");E.post.innerHTML='<div class="loading">게시글을 불러오는 중…</div>';
 let {data:all,error}=await S.db.from("blog_posts").select("*, profiles:blog_profiles!blog_posts_author_id_fkey(id,username,display_name,avatar_url,badge_type,badge_approved)").order("created_at",{ascending:false}).limit(500);if(error){E.post.textContent=error.message;return}
 let token=slug.split("-").pop(),p=(all||[]).find(x=>x.profiles?.username===username&&shortId(x.id)===token);if(!p){E.post.innerHTML='<div class="empty">게시글을 찾을 수 없습니다.</div>';return}
 let [att,cr,lk]=await Promise.all([S.db.from("blog_attachments").select("*").eq("post_id",p.id).order("created_at"),S.db.from("blog_comments").select("*, profiles:blog_profiles!blog_comments_author_id_fkey(id,username,display_name,avatar_url,badge_type,badge_approved)").eq("post_id",p.id).order("created_at"),S.user?S.db.from("blog_likes").select("post_id").eq("post_id",p.id).eq("user_id",S.user.id).maybeSingle():Promise.resolve({data:null})]);
 let files=(att.data||[]).map(a=>{let u=safeUrl(a.public_url);if(!u)return"";if(a.mime_type?.startsWith("image/"))return `<a class="attachment" href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="${esc(a.file_name)}">${esc(a.file_name)}</a>`;if(a.mime_type?.startsWith("video/"))return `<div class="attachment"><video controls preload="metadata" src="${esc(u)}"></video><a href="${esc(u)}" target="_blank" rel="noopener">${esc(a.file_name)}</a></div>`;return `<a class="attachment" href="${esc(u)}" target="_blank" rel="noopener noreferrer" download>파일 · ${esc(a.file_name)}</a>`}).join("");
 let owner=S.user?.id===p.author_id;
 E.post.innerHTML=`<div class="post-meta">${avatar(p.profiles)}<div>${author(p.profiles)}<div>${date(p.created_at)}</div></div></div><h1 class="post-title">${esc(p.title)}</h1><div class="post-body">${renderBody(p.body||"")}</div><div class="attachment-list">${files}</div><div class="post-actions"><button id="postLike" class="${lk.data?"liked":""}">${lk.data?"♥":"♡"} 좋아요 <span id="likeCount">…</span></button>${owner?'<button id="deletePost" class="quiet">게시글 삭제</button>':""}</div>
 <section class="comments" id="comments"><h2 style="font-size:17px">댓글 ${(cr.data||[]).length}</h2>${(cr.data||[]).map(c=>`<div class="comment"><div class="post-meta">${author(c.profiles)} <span>${date(c.created_at)}</span>${S.user&&(S.user.id===c.author_id||S.user.email?.toLowerCase()==="cucu@oscadia.net")?`<button data-delete-comment="${c.id}" class="quiet">삭제</button>`:""}</div><div>${renderBody(c.body)}</div></div>`).join("")}${S.user?'<form id="commentForm" class="comment-form"><input id="commentText" maxlength="3000" placeholder="댓글을 남겨 보세요" required><button class="primary">등록</button></form>':'<p class="muted small">댓글을 작성하려면 로그인하세요.</p>'}</section>`;
 likeCount(p.id).then(n=>{if($("likeCount"))$("likeCount").textContent=n});$("postLike").onclick=()=>toggleLike(p.id);
 if(owner)$("deletePost").onclick=async()=>{if(confirm("이 게시글을 삭제할까요?")){let r=await S.db.from("blog_posts").delete().eq("id",p.id);if(r.error)notice(r.error.message,true);else go("/")}};
 if(S.user)$("commentForm").onsubmit=async e=>{e.preventDefault();let body=$("commentText").value.trim();if(!body)return;let r=await S.db.from("blog_comments").insert({post_id:p.id,author_id:S.user.id,body});if(r.error)notice(r.error.message,true);else loadPost(username,slug)};
 E.post.querySelectorAll("[data-delete-comment]").forEach(b=>b.onclick=async()=>{let r=await S.db.from("blog_comments").delete().eq("id",b.dataset.deleteComment);if(r.error)notice(r.error.message,true);else loadPost(username,slug)})
}
function insertAtCursor(text){let ta=$("postBody"),start=ta.selectionStart,end=ta.selectionEnd;ta.setRangeText(text,start,end,"end");ta.focus()}
function addLink(){let url=prompt("https://로 시작하는 URL을 입력하세요");if(!url)return;let safe=safeUrl(url);if(!safe){notice("http 또는 https 주소만 사용할 수 있습니다.",true);return}let label=prompt("링크에 표시할 글자",safe)||safe;insertAtCursor(`[${label.replace(/[\]]/g,"")}](${safe})`)}
async function publish(){
 if(!S.user){go("/login");return}let title=$("postTitle").value.trim(),body=$("postBody").value.trim(),files=S.selectedFiles.slice();if(!title||!body){notice("제목과 본문을 입력하세요.",true);return}if(files.some(f=>f.size>50*1024*1024)){notice("파일당 최대 크기는 50MB입니다.",true);return}
 $("publish").disabled=true;$("uploadStatus").textContent="게시글을 저장하는 중…";
 try{
  let r=await S.db.from("blog_posts").insert({author_id:S.user.id,title,body}).select().single();if(r.error)throw r.error;let post=r.data,finalBody=body;
  for(let i=0;i<files.length;i++){let f=files[i];$("uploadStatus").textContent=`미디어 업로드 중… ${i+1}/${files.length}`;let ext=(f.name.split(".").pop()||"bin").replace(/[^a-z0-9]/gi,"").slice(0,8)||"bin";let path=`${S.user.id}/${post.id}/${crypto.randomUUID()}.${ext}`;
   let up=await S.db.storage.from("blog-attachments").upload(path,f,{upsert:false,contentType:f.type||"application/octet-stream"});if(up.error)throw up.error;
   let url=S.db.storage.from("blog-attachments").getPublicUrl(path).data.publicUrl;
   let meta=await S.db.from("blog_attachments").insert({post_id:post.id,uploader_id:S.user.id,storage_path:path,file_name:f.name,mime_type:f.type||"application/octet-stream",size_bytes:f.size,public_url:url});if(meta.error)throw meta.error;
   let token=`{{upload:${i}}}`;
   let inserted=f.type.startsWith("image/")?`![${f.name.replace(/[\]]/g,"")} ](${url})`:f.type.startsWith("video/")?`{{video:${url}}}`:`[${f.name.replace(/[\]]/g,"")} ](${url})`;
   finalBody=finalBody.split(token).join(inserted);
  }
  let upd=await S.db.from("blog_posts").update({body:finalBody}).eq("id",post.id);if(upd.error)throw upd.error;
  S.selectedFiles=[];$("postTitle").value="";$("postBody").value="";$("mediaFiles").value="";$("selectedFiles").textContent="";$("uploadStatus").textContent="";go(hrefPost({...post,username:S.profile.username}));
 }catch(e){notice("게시글 저장 오류: "+e.message,true)}finally{$("publish").disabled=false}
}
async function renderRoute(){clearNotice();if(!configured){only("feed");E.feed.innerHTML='<div class="empty">config.js에 OSCADIA Supabase Project URL과 anon/public key를 입력하세요.</div>';return}if(S.route.type==="auth"){only("auth");return}if(S.route.type==="write"){if(!S.user){only("auth");notice("글을 작성하려면 로그인하세요.")}else only("write");return}if(S.route.type==="profile")return loadProfile(S.route.username);if(S.route.type==="post")return loadPost(S.route.username,S.route.slug);only("feed");return loadPosts($("search").value.trim())}
async function init(){if(!configured){E.feed.innerHTML='<div class="empty">README.md를 확인하고 config.js를 설정하세요.</div>';return}S.db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);await session();S.route=route();await renderRoute();S.db.auth.onAuthStateChange(async()=>{await session();if(S.route.type==="feed")loadPosts($("search").value.trim())})}
E.authButton.onclick=async()=>{if(S.user){let r=await S.db.auth.signOut();if(r.error)notice(r.error.message,true);else{S.user=null;S.profile=null;updateAccount();go("/")}}else go("/login")};
$("signIn").onclick=async()=>{let r=await S.db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(r.error)notice(r.error.message,true);else{await session();go("/")}};
$("signUp").onclick=async()=>{let r=await S.db.auth.signUp({email:$("email").value.trim(),password:$("password").value,options:{emailRedirectTo:location.origin+"/"}});if(r.error)notice(r.error.message,true);else notice("가입 요청을 보냈습니다. 이메일 인증이 필요할 수 있습니다.")};
$("cancelAuth").onclick=()=>go("/");$("writeNav").onclick=$("heroWrite").onclick=()=>go("/write");$("cancelWrite").onclick=()=>go("/");$("publish").onclick=publish;
$("insertLink").onclick=addLink;$("insertMedia").onclick=()=>$("mediaFiles").click();
$("mediaFiles").onchange=()=>{let picked=[...$("mediaFiles").files];if(!picked.length)return;let start=S.selectedFiles.length;S.selectedFiles.push(...picked);insertAtCursor(picked.map((f,i)=>`{{upload:${start+i}}}`).join("\n"));$("selectedFiles").textContent=S.selectedFiles.map((f,i)=>`${i}: ${f.name}`).join(" · ");$("mediaFiles").value=""};
$("searchBtn").onclick=()=>loadPosts($("search").value.trim());$("search").onkeydown=e=>{if(e.key==="Enter")loadPosts($("search").value.trim())};
E.feed.addEventListener("click",e=>{let b=e.target.closest("[data-like]");if(b)toggleLike(b.dataset.like)});
E.myProfile.onclick=e=>{e.preventDefault();if(S.profile)go("/profiles/"+encodeURIComponent(S.profile.username))};
window.onpopstate=()=>{S.route=route();renderRoute()};init();
})();
