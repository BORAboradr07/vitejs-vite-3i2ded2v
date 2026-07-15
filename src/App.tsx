import { useState, useEffect, useCallback, useRef } from "react";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SB_URL = "https://ukqfxyarurvrxjtumjfm.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcWZ4eWFydXJ2cnhqdHVtamZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MjcxMzYsImV4cCI6MjA5NTIwMzEzNn0.5SpZ5q4B1-qB5IcPFNUCFcxoKJuddThph_A16mE3gMk";

// Kasa Supabase - sadece hasta kontrolü için
const KASA_URL = "https://pwcyawsgjzjcydcisyvy.supabase.co";
const KASA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3Y3lhd3NnanpqY3lkY2lzeXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDA4MDEsImV4cCI6MjA5NDcxNjgwMX0.gnee9oYsFpxzdb_-H-JtRC2fU0Imj2Dajybt7or9a0Y";
const HDR = { "Content-Type":"application/json", "apikey":SB_KEY, "Authorization":"Bearer "+SB_KEY };

// ── AUTH ─────────────────────────────────────────────────────────────────────
async function sbLogin(email, sifre){
  const r=await fetch(`${SB_URL}/auth/v1/token?grant_type=password`,{
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SB_KEY},
    body:JSON.stringify({email,password:sifre})
  });
  const data=await r.json();
  if(!r.ok) throw new Error(data.error_description||data.msg||"Giriş hatası");
  return data;
}

async function sbLogout(token){
  await fetch(`${SB_URL}/auth/v1/logout`,{
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+token}
  });
}

async function kullaniciBilgi(token){
  const r=await fetch(`${SB_URL}/rest/v1/kullanicilar?select=login_name,rol`,{
    headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+token}
  });
  if(!r.ok) throw new Error("Kullanıcı bilgisi alınamadı");
  const data=await r.json();
  return data[0]||null;
}


async function kasadaHastaVarMi(ad){
  try{
    const r=await fetch(`${KASA_URL}/rest/v1/hastalar?ad=ilike.*${encodeURIComponent(ad.trim())}*&select=id,ad`,{
      headers:{"Content-Type":"application/json","apikey":KASA_KEY,"Authorization":"Bearer "+KASA_KEY}
    });
    if(!r.ok) return [];
    return r.json();
  } catch(e){ return []; }
}

async function sbGet(tablo, params=""){
  const SAYFA=1000;
  let tumKayitlar=[];
  let bas=0;
  while(true){
    const r = await fetch(`${SB_URL}/rest/v1/${tablo}?${params}&order=id.asc`, {
      headers:{...HDR,"Prefer":"return=representation","Range-Unit":"items","Range":`${bas}-${bas+SAYFA-1}`}
    });
    if(!r.ok) throw new Error(await r.text());
    const parca = await r.json();
    tumKayitlar = tumKayitlar.concat(parca);
    if(parca.length < SAYFA) break;
    bas += SAYFA;
  }
  return tumKayitlar;
}
async function sbInsert(tablo, data){
  const r = await fetch(`${SB_URL}/rest/v1/${tablo}`, {method:"POST", headers:{...HDR,"Prefer":"return=representation"}, body:JSON.stringify(data)});
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}
async function sbUpdate(tablo, id, data){
  const r = await fetch(`${SB_URL}/rest/v1/${tablo}?id=eq.${id}`, {method:"PATCH", headers:{...HDR,"Prefer":"return=representation"}, body:JSON.stringify(data)});
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}
async function sbDelete(tablo, id){
  const r = await fetch(`${SB_URL}/rest/v1/${tablo}?id=eq.${id}`, {method:"DELETE", headers:HDR});
  if(!r.ok) throw new Error(await r.text());
}

// ── localStorage ────────────────────────────────────────────────────────────
function useLocalStorage(key, init) {
  const [state, setState] = useState(() => {
    try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) : init; }
    catch { return init; }
  });
  const set = useCallback((value) => {
    setState(prev => {
      const v = typeof value === "function" ? value(prev) : value;
      try { window.localStorage.setItem(key, JSON.stringify(v)); } catch {}
      return v;
    });
  }, [key]);
  return [state, set];
}

// ── SABİTLER ─────────────────────────────────────────────────────────────────
const BOLGE_SURELER = {
  "T.Bacak":30,"T.Kol":15,"Göbek":15,"Sırt":30,"Yüz":15,
  "Koltukaltı":10,"Genital":10,"Ense":10,"Sakal Üstü":10,
  "Boyun":10,"Bel":15,"Göğüs Arası":10,"Omuz":15,"Popo":15,
  "Koltuk Altı":10,"Karbon":20,"Cilt Bakımı":75,"Forma":45,"Tüy Sarartma":20,
  "Çene":10,"Bıyık":10,"Kulak Önü":10,"Alın":10,"Göğüs Ucu":10,
  "Alt Bacak":15,"Üst Bacak":20,"Yarım Kol":10,"Gövde":30,
};
const ISLEM_KATEGORI = {"Karbon":"karbon","Cilt Bakımı":"cilt","Forma":"forma","Tüy Sarartma":"tuysarart"};
const RENK = {
  alex:      {bg:"#2d6a35",brd:"#3d8a47",label:"Alex Lazer (Yeşil)"},
  soprano:   {bg:"#5b3fa0",brd:"#7a55c8",label:"Soprano Lazer (Mor)"},
  cilt:      {bg:"#d6336c",brd:"#e8578a",label:"Cilt Bakımı (Pembe)"},
  karbon:    {bg:"#1a1a1a",brd:"#444444",label:"Karbon (Siyah)"},
  tuysarart: {bg:"#a07c10",brd:"#c9a020",label:"Tüy Sarartma (Sarı)"},
  gelmedi:   {bg:"#7a3f3f",brd:"#9b5050",label:"Gelmedi"},
  blok:      {bg:"#555",brd:"#777",label:"Blok"},
};
const SOPRANO_BOLGELER = ["T.Bacak","T.Kol","Göbek","Sırt","Yüz","Koltukaltı","Genital","Ense","Sakal Üstü","Boyun","Bel","Göğüs Arası","Omuz","Popo","Çene","Bıyık","Kulak Önü","Alın","Göğüs Ucu","Alt Bacak","Üst Bacak","Yarım Kol","Gövde","Karbon","Cilt Bakımı","Forma","Tüy Sarartma"];
const ALEX_BOLGELER    = ["T.Bacak","T.Kol","Göbek","Sırt","Yüz","Koltuk Altı","Genital","Ense","Sakal Üstü","Boyun","Bel","Göğüs Arası","Omuz","Popo","Çene","Bıyık","Kulak Önü","Alın","Göğüs Ucu","Alt Bacak","Üst Bacak","Yarım Kol","Gövde"];
const ODEME_TIPLERI    = ["Nakit","Kart","EFT","Ödeme Alınmadı"];
const DURUMLAR_ALEX    = ["Seans","Kontrol","Gelmedi"];
const DURUMLAR_SOPRANO = ["Seans","Gelmedi"];
const ROLLER = {yonetici:"Yönetici",sekreter:"Sekreter",personel:"Uygulayıcı",sorumlu:"Sorumlu"};

const SAATLER = [];
for(let h=9;h<=20;h++) for(let m=0;m<60;m+=5){if(h===20&&m>0)break;SAATLER.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);}

function timeToMin(t){const[h,m]=t.split(":").map(Number);return h*60+m;}
function minToTime(m){return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;}
function today(){
  // Türkiye saat dilimine göre "bugün" — UTC bazlı toISOString() gece 00:00-03:00 arası yanlış gün verebiliyordu
  const parcalar=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const y=parcalar.find(p=>p.type==="year").value,m=parcalar.find(p=>p.type==="month").value,d=parcalar.find(p=>p.type==="day").value;
  return `${y}-${m}-${d}`;
}
function addDays(d,n){const[y,mo,dy]=d.split("-").map(Number);const dt=new Date(y,mo-1,dy);dt.setDate(dt.getDate()+n);return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;}
function formatDate(d){const dt=new Date(d+"T00:00:00");return dt.toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});}
function formatDateShort(d){const dt=new Date(d+"T00:00:00");return dt.toLocaleDateString("tr-TR",{weekday:"short",day:"numeric",month:"short"});}
function nowTime(){return new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});}
function dayOfWeek(d){return new Date(d+"T00:00:00").getDay();}

function dilimSayisi(sure){
  if(sure>=90) return 4;
  if(sure>60) return 3;
  if(sure>30) return 2;
  return 1;
}
function dilimSayisiBosluk(sure){
  if(sure>150) return 6;
  if(sure>90) return 5;
  return dilimSayisi(sure);
}

function islemRenk(bolgeler,oda,durum){
  if(durum==="Gelmedi") return RENK.gelmedi;
  if(oda==="alex") return RENK.alex;
  const kat=ISLEM_KATEGORI[bolgeler?.[0]];
  if(kat==="karbon") return RENK.karbon;
  if(kat==="cilt") return RENK.cilt;
  if(kat==="tuysarart") return RENK.tuysarart;
  return RENK.soprano;
}


// ── ANKET FONKSİYONLARI ──────────────────────────────────────────────────────
function anketToken(){return Math.random().toString(36).slice(2,8)+Date.now().toString(36);}
function anketTipi(oda,bolgeler){
  const b=bolgeler||[];
  if(b.includes("Cilt Bakımı")||b.includes("Karbon")||b.includes("Tüy Sarartma")) return "cilt";
  return "lazer";
}
async function anketOlustur(randevu){
  const token=anketToken();
  await sbInsert("anketler",{
    token,
    hasta:randevu.hasta,
    randevu_id:randevu.id,
    randevu_tarih:randevu.tarih,
    oda:randevu.oda,
    anket_tipi:anketTipi(randevu.oda,randevu.bolgeler),
    tamamlandi:false,
    olusturma_tarih:today()
  });
  return token;
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────


// ── GİRİŞ EKRANI ─────────────────────────────────────────────────────────────
function GirisEkrani({onGiris}){
  const [loginName,setLoginName]=useState("");
  const [sifre,setSifre]=useState("");
  const [hata,setHata]=useState("");
  const [yukleniyor,setYukleniyor]=useState(false);

  async function girisYap(){
    if(!loginName.trim()||!sifre.trim()){setHata("Kullanıcı adı ve şifre gerekli.");return;}
    setYukleniyor(true);setHata("");
    try{
      const email=loginName.toLowerCase().trim()+"@klinik.local";
      const authRes=await fetch(SB_URL+"/auth/v1/token?grant_type=password",{
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":SB_KEY},
        body:JSON.stringify({email,password:sifre})
      });
      const authData=await authRes.json();
      if(!authRes.ok) throw new Error("Kullanıcı adı veya şifre hatalı.");
      const email2=loginName.toLowerCase().trim()+"@klinik.local";
      const kulRes=await fetch(SB_URL+"/rest/v1/kullanicilar?email=eq."+encodeURIComponent(email2)+"&select=login_name,rol",{
        headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+authData.access_token}
      });
      const kulData=await kulRes.json();
      if(!kulData||kulData.length===0) throw new Error("Kullanıcı bulunamadı.");
      const kullanici={login_name:kulData[0].login_name,rol:kulData[0].rol,token:authData.access_token};
      try{window.localStorage.setItem("kl_user",JSON.stringify(kullanici));}catch{}
      onGiris(kullanici);
    } catch(e){
      setHata(e.message||"Giriş başarısız.");
      setYukleniyor(false);
    }
  }

  return(
    <div style={{minHeight:"100vh",background:"#f5f4f1",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',system-ui,sans-serif",padding:16}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
      <div style={{background:"#fff",borderRadius:20,padding:"2.5rem 2rem",width:"100%",maxWidth:380,boxShadow:"0 8px 40px rgba(0,0,0,0.1)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:56,height:56,background:"linear-gradient(135deg,#a78bfa,#60a5fa)",borderRadius:16,margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🌸</div>
          <div style={{fontSize:18,fontWeight:700,color:"#1a1a2e"}}>LazerKlinik</div>
          <div style={{fontSize:13,color:"#888",marginTop:4}}>Dr. Duygu Coşkun Özbakır Kliniği</div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Kullanıcı Adı</div>
          <input autoFocus value={loginName} onChange={e=>setLoginName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&girisYap()} placeholder="meltem, fatma, merve..." style={{width:"100%",padding:"11px 14px",border:"1.5px solid #ddd",borderRadius:10,fontSize:15,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Şifre</div>
          <input type="password" value={sifre} onChange={e=>setSifre(e.target.value)} onKeyDown={e=>e.key==="Enter"&&girisYap()} placeholder="••••••••" style={{width:"100%",padding:"11px 14px",border:"1.5px solid #ddd",borderRadius:10,fontSize:15,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
        </div>
        {hata&&<div style={{background:"#fee2e2",color:"#dc2626",padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:14}}>{hata}</div>}
        <button onClick={girisYap} disabled={yukleniyor} style={{width:"100%",padding:"13px",background:yukleniyor?"#a5b4fc":"#6366f1",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,cursor:yukleniyor?"not-allowed":"pointer",fontFamily:"inherit"}}>
          {yukleniyor?"Giriş yapılıyor...":"Giriş Yap"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  // Login state - localStorage'dan oku
  const [aktifKullanici,setAktifKullanici] = useState(()=>{
    try{const u=window.localStorage.getItem("kl_user");return u?JSON.parse(u):null;}catch{return null;}
  });
  const [aktifRol,setAktifRol]       = useState(()=>{
    try{const u=window.localStorage.getItem("kl_user");const p=u?JSON.parse(u):null;return p?.rol||"sekreter";}catch{return "sekreter";}
  });
  const [aktifSekme,setAktifSekme]   = useState("takvim");
  const [seciliTarih,setSeciliTarih] = useLocalStorage("kl_tarih",today());
  const [yoneticiKilit,setYoneticiKilit] = useState(()=>{try{return window.localStorage.getItem("kl_yonetici_onay")!=="1";}catch{return true;}});
  const [dashboardKilit,setDashboardKilit] = useState(()=>{try{return window.localStorage.getItem("kl_dashboard_onay")!=="1";}catch{return false;}});
  const [sifreModal,setSifreModal]   = useState(null);

  const [randevular,setRandevular]   = useState([]);
  const [hastalar,setHastalar]       = useState([]);
  const [bekleme,setBekleme]         = useState([]);
  const [silLog,setSilLog]           = useState([]);
  const [gunIciLog,setGunIciLog]     = useState([]);
  const [bloklar,setBloklar]         = useState([]);
  const [yukleniyor,setYukleniyor]   = useState(true);
  const [modal,setModal]             = useState(null);
  const [toast,setToast]             = useState(null);

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),2800);};

  function kullaniciGiris(k){
    setAktifKullanici(k);
    setAktifRol(k.rol||"sekreter");
    setAktifSekme("takvim");
  }
  function cikisYap(){
    try{window.localStorage.removeItem("kl_user");window.localStorage.removeItem("kl_yonetici_onay");window.localStorage.removeItem("kl_dashboard_onay");}catch{}
    setAktifKullanici(null);
    setAktifRol("sekreter");
    setAktifSekme("takvim");
  }



  useEffect(()=>{
    async function yukle(){
      try{
        setYukleniyor(true);
        const [r,h,b,sl,gl,bl]=await Promise.all([
          sbGet("randevular"),
          sbGet("hastalar"),
          sbGet("bekleme"),
          sbGet("sil_log","order=id.desc"),
          sbGet("gunici_log","order=id.desc"),
          sbGet("bloklar"),
        ]);
        const hastaMap={};
        h.forEach(hs=>{if(hs.ad)hastaMap[hs.ad.toLowerCase().trim()]={tel:hs.tel||"",cinsiyet:hs.cinsiyet||"Bayan"};});
        setRandevular(r.map(x=>({...x,bolgeler:x.bolgeler||[],log:x.log||[],tel:x.tel||(hastaMap[x.hasta?.toLowerCase().trim()]?.tel||""),cinsiyet:x.cinsiyet||(hastaMap[x.hasta?.toLowerCase().trim()]?.cinsiyet||"Bayan")})));
        setHastalar(h);
        setBekleme(b.map(x=>({...x,bolgeler:x.bolgeler||[]})));
        setSilLog(sl.map(x=>({...x,bolgeler:x.bolgeler||[]})));
        setGunIciLog(gl.map(x=>({...x,bolgeler:x.bolgeler||[]})));
        setBloklar(bl);
      } catch(e){ showToast("Veriler yüklenemedi: "+e.message,"error"); }
      finally{ setYukleniyor(false); }
    }
    yukle();
  },[]);

  const gunR    = randevular.filter(r=>r.tarih===seciliTarih);
  const alexR   = gunR.filter(r=>r.oda==="alex").sort((a,b)=>timeToMin(a.saat)-timeToMin(b.saat));
  const sopR    = gunR.filter(r=>r.oda==="soprano").sort((a,b)=>timeToMin(a.saat)-timeToMin(b.saat));
  const gunB    = bloklar.filter(b=>b.tarih===seciliTarih);

  function cakismaVar(oda,tarih,saat,sure,excludeId=null){
    const yB=timeToMin(saat),yE=yB+sure;
    const rc=randevular.filter(r=>r.oda===oda&&r.tarih===tarih&&r.id!==excludeId)
      .find(r=>{const b=timeToMin(r.saat),e=b+r.sure;return yB<e&&yE>b;});
    const bc=bloklar.filter(b=>b.oda===oda&&b.tarih===tarih&&b.baslik!=="DR_YOK")
      .find(b=>{const bb=timeToMin(b.saat),be=bb+b.sure;return yB<be&&yE>bb;});
    if(bc) return {tip:"blok",mesaj:`⛔ Bu saat bloklu: "${bc.baslik}" (${bc.saat}, ${bc.sure} dk).`};
    if(rc){
      if(oda==="soprano") return {tip:"uyari",mesaj:`⚠️ Bu saatte ${rc.hasta} adlı hastanın randevusu var (${rc.saat}, ${rc.sure} dk). Yine de devam etmek istiyor musunuz?`};
      return {tip:"randevu",mesaj:`⚠️ Bu saatte ${rc.hasta} adlı hastanın randevusu var (${rc.saat}, ${rc.sure} dk).`};
    }
    return null;
  }

  async function randevuKaydet(data){
    // Geçmiş tarihe randevu kontrolü (sadece yeni randevularda)
    const tarihKontrol=data.tarih||seciliTarih;
    if(!data.id&&tarihKontrol<today()){
      showToast("Geçmiş tarihe randevu oluşturulamaz!","error");
      return false;
    }
    // Pazar günleri klinik kapalı — kesin engel (sadece yeni randevu oluşturmada; var olan eski kayıtların düzenlenmesini engellemiyor)
    if(!data.id&&new Date(tarihKontrol+"T00:00:00").getDay()===0){
      showToast("Pazar günleri kapalıyız, randevu oluşturulamaz.","error");
      return false;
    }
    // Düzenleme modunda tarih değiştiriliyorsa ve geçmişe alınmak isteniyorsa uyar
    if(data.id&&data.tarih&&data.tarih<today()){
      if(!window.confirm("⚠️ Randevuyu geçmiş bir tarihe taşımak istiyorsunuz. Devam etmek istiyor musunuz?")) return false;
    }
    const saatMin=timeToMin(data.saat);
    const bitisMin=saatMin+data.sure;
    const drYokVarMi=bloklar.filter(b=>b.baslik==="DR_YOK"&&b.tarih===tarihKontrol)
      .some(b=>{const bb=timeToMin(b.saat),be=bb+b.sure;return saatMin<be&&bitisMin>bb;});
    if(drYokVarMi){
      if(!window.confirm("⚠️ Bu zaman aralığında Dr. Duygu Hanım klinikte olmayacak. Yine de randevu oluşturmak istiyor musunuz?")) return false;
    }
    const cakisma=cakismaVar(data.oda,tarihKontrol,data.saat,data.sure,data.id);
    if(cakisma){
      if(cakisma.tip==="uyari"){
        if(!window.confirm(cakisma.mesaj)) return false;
      } else {
        showToast(cakisma.mesaj,"error");return false;
      }
    }
    const now=nowTime();
    try{
      if(data.id){
        const eskiR=randevular.find(r=>r.id===data.id);
        const yeniLog=[...(eskiR?.log||[]),{saat:now,kullanici:ROLLER[aktifRol],islem:"Randevu güncellendi"}];
        try{
          if((data.tarih||seciliTarih)===today()&&(aktifRol==="sekreter"||aktifRol==="personel")){
            const gl={deg_tarih:today(),deg_saat:now,kullanic:ROLLER[aktifRol],hasta:data.hasta,oda:data.oda,randevu_tarih:data.tarih,eski_saat:eskiR?.saat,eski_sure:eskiR?.sure,yeni_saat:data.saat,yeni_sure:data.sure,bolgeler:data.bolgeler||[]};
            const [ins]=await sbInsert("gunici_log",gl);
            setGunIciLog(prev=>[{...gl,id:ins.id,degTarih:gl.deg_tarih,degSaat:gl.deg_saat,kullanic:gl.kullanic,eskiSaat:gl.eski_saat,eskiSure:gl.eski_sure,yeniSaat:gl.yeni_saat,yeniSure:gl.yeni_sure},...prev]);
          }
        }catch(logErr){console.warn("Log kaydedilemedi:",logErr);}
        const sbData={oda:data.oda,hasta:data.hasta,hasta_id:data.hastaId,tarih:data.tarih||seciliTarih,saat:data.saat,sure:data.sure,bolgeler:data.bolgeler||[],durum:data.durum,odeme:data.odeme,notlar:data.notlar||"",log:yeniLog};
        await sbUpdate("randevular",data.id,sbData);
        setRandevular(prev=>prev.map(r=>r.id===data.id?{...r,...sbData,id:data.id}:r));
        showToast("Randevu güncellendi.");
      } else {
        const hastaObj2=hastalar.find(h=>h.id===data.hastaId)||hastalar.find(h=>h.ad?.toLowerCase().trim()===data.hasta?.toLowerCase().trim());
        const sbData={oda:data.oda,hasta:data.hasta,hasta_id:data.hastaId,tarih:data.tarih||seciliTarih,saat:data.saat,sure:data.sure,bolgeler:data.bolgeler||[],durum:data.durum||"Seans",odeme:data.odeme,notlar:data.notlar||"",tel:data.tel||hastaObj2?.tel||"",cinsiyet:data.cinsiyet||hastaObj2?.cinsiyet||"Bayan",log:[{saat:now,kullanici:ROLLER[aktifRol],islem:"Randevu oluşturuldu"}]};
        const [ins]=await sbInsert("randevular",sbData);
        // hastalar tablosundan tel ve cinsiyet bilgisini al
        const hastaObj=hastalar.find(h=>h.ad?.toLowerCase().trim()===sbData.hasta?.toLowerCase().trim());
        setRandevular(prev=>[...prev,{...sbData,id:ins.id,tel:sbData.tel||hastaObj?.tel||"",cinsiyet:sbData.cinsiyet||hastaObj?.cinsiyet||"Bayan"}]);
        showToast("Randevu oluşturuldu.");
      }
      setModal(null);return true;
    } catch(e){showToast("Hata: "+e.message,"error");return false;}
  }

  async function durumGuncelle(id,durum,odeme){
    const now=nowTime();
    const r=randevular.find(x=>x.id===id);
    // Ödeme değişikliği logu
    const logMesajlar=[];
    if(durum&&durum!==r?.durum) logMesajlar.push(`Durum: ${r?.durum||"-"} → ${durum}`);
    if(odeme!==undefined&&odeme!==r?.odeme) logMesajlar.push(`Ödeme: ${r?.odeme||"Yok"} → ${odeme||"Yok"}`);
    const yeniLog=[...(r?.log||[]),{saat:now,kullanici:ROLLER[aktifRol],islem:logMesajlar.join(" | ")||"Güncellendi"}];
    try{
      await sbUpdate("randevular",id,{...(durum?{durum}:{}),...(odeme!==undefined?{odeme}:{}),log:yeniLog});
      setRandevular(prev=>prev.map(x=>x.id!==id?x:{...x,...(durum?{durum}:{}),...(odeme!==undefined?{odeme}:{}),log:yeniLog}));
      showToast("Güncellendi.");
    } catch(e){showToast("Hata: "+e.message,"error");}
  }

  async function randevuHastaBilgisiDuzenle(r,yeniAd,yeniTel){
    const ad=yeniAd.trim(),tel=yeniTel.trim();
    if(!ad){showToast("Ad soyad boş olamaz.","error");return false;}
    // Bu hastanın "hastalar" tablosunda kaydı var mı? (hasta_id ya da isimle eşleştir)
    const hastaKaydi=hastalar.find(h=>h.hasta_id&&r.hasta_id&&h.hasta_id===r.hasta_id)
      ||hastalar.find(h=>h.ad?.toLowerCase().trim()===r.hasta?.toLowerCase().trim());
    if(hastaKaydi){
      // Varsa: hastalar tablosu + bu hastaya ait TÜM randevu kayıtları birlikte güncellenir
      const ok=await hastaGuncelle(hastaKaydi,ad,tel,hastaKaydi.cinsiyet||"Bayan");
      if(ok)setModal(null);
      return ok;
    }
    // Yoksa (hastalar tablosunda kaydı yoksa): sadece bu randevu kaydını güncelle
    const now=nowTime();
    const yeniLog=[...(r?.log||[]),{saat:now,kullanici:ROLLER[aktifRol],islem:`Hasta bilgisi değiştirildi: "${r?.hasta}" → "${ad}"`}];
    try{
      await sbUpdate("randevular",r.id,{hasta:ad,tel,log:yeniLog});
      setRandevular(prev=>prev.map(x=>x.id!==r.id?x:{...x,hasta:ad,tel,log:yeniLog}));
      showToast("Hasta bilgileri güncellendi.");
      setModal(null);
      return true;
    }catch(e){showToast("Hata: "+e.message,"error");return false;}
  }

  // ✅ DÜZELTME: Eksik olan fonksiyon başlığı geri eklendi
  async function bolgeGuncelle(id,yeniBolgeler,yeniSure){
    try{
      const r=randevular.find(x=>x.id===id);
      // Çakışma kontrolü - süre uzadıysa
      if(yeniSure>(r?.sure||0)){
        const cakisma=cakismaVar(r.oda,r.tarih,r.saat,yeniSure,id);
        if(cakisma){
          if(cakisma.tip==="uyari"){
            if(!window.confirm(cakisma.mesaj)) return;
          } else {
            showToast(cakisma.mesaj,"error");return;
          }
        }
      }
      const now=nowTime();
      const yeniLog=[...(r?.log||[]),{saat:now,kullanici:ROLLER[aktifRol],islem:`Bölge güncellendi: ${yeniBolgeler.join(", ")} (${yeniSure}dk)`}];
      await sbUpdate("randevular",id,{bolgeler:yeniBolgeler,sure:yeniSure,log:yeniLog});
      setRandevular(prev=>prev.map(x=>x.id!==id?x:{...x,bolgeler:yeniBolgeler,sure:yeniSure,log:yeniLog}));
      showToast("Bölgeler güncellendi!");
    } catch(e){showToast("Hata: "+e.message,"error");}
  }

  async function randevuTasi(randevu, yeniSaat){
    try{
      const cakisma=cakismaVar(randevu.oda,randevu.tarih,yeniSaat,randevu.sure,randevu.id);
      if(cakisma){
        if(cakisma.tip==="uyari"){
          if(!window.confirm(cakisma.mesaj)) return false;
        } else {
          showToast(cakisma.mesaj,"error");return false;
        }
      }
      const now=nowTime();
      const yeniLog=[...(randevu.log||[]),{saat:now,kullanici:ROLLER[aktifRol],islem:`Saat değiştirildi: ${randevu.saat} → ${yeniSaat}`}];
      await sbUpdate("randevular",randevu.id,{saat:yeniSaat,log:yeniLog});
      setRandevular(prev=>prev.map(r=>r.id===randevu.id?{...r,saat:yeniSaat,log:yeniLog}:r));
      showToast(`Randevu ${yeniSaat}'e taşındı.`);
      return true;
    } catch(e){showToast("Hata: "+e.message,"error");return false;}
  }

  async function randevuSil(id){
    const r=randevular.find(x=>x.id===id);
    try{
      if(r){
        const sl={sil_tarih:today(),sil_saat:nowTime(),kullanic:ROLLER[aktifRol],hasta:r.hasta,oda:r.oda,randevu_tarih:r.tarih,randevu_saat:r.saat,bolgeler:r.bolgeler||[],sure:r.sure,durum:r.durum,odeme:r.odeme};
        const [ins]=await sbInsert("sil_log",sl);
        setSilLog(prev=>[{...sl,id:ins.id,silTarih:sl.sil_tarih,silSaat:sl.sil_saat,kullanic:sl.kullanic,randevuTarih:sl.randevu_tarih,randevuSaat:sl.randevu_saat},...prev]);
      }
      await sbDelete("randevular",id);
      setRandevular(prev=>prev.filter(x=>x.id!==id));
      setModal(null);showToast("Randevu silindi — log kaydedildi.");
    } catch(e){showToast("Hata: "+e.message,"error");}
  }

  async function blokEkle(yeniBloklar){
    try{
      const inserted=await Promise.all(yeniBloklar.map(b=>sbInsert("bloklar",{oda:b.oda,tarih:b.tarih,saat:b.saat,sure:b.sure,baslik:b.baslik}).then(r=>({...b,id:r[0].id}))));
      setBloklar(prev=>[...prev,...inserted]);
      showToast(`${inserted.length} blok eklendi.`);
    } catch(e){showToast("Hata: "+e.message,"error");}
  }

  async function blokSil(id){
    try{
      await sbDelete("bloklar",id);
      setBloklar(prev=>prev.filter(x=>x.id!==id));
    } catch(e){showToast("Hata: "+e.message,"error");}
  }

  async function hastaGuncelle(hasta,yeniAd,yeniTel,yeniCinsiyet,yeniHastaId){
    try{
      const eskiAd=hasta.ad;
      const eskiHastaId=hasta.hasta_id;
      const hastaIdDegisti=yeniHastaId!==undefined&&yeniHastaId!==eskiHastaId;
      const guncelAlanlar={ad:yeniAd,tel:yeniTel,cinsiyet:yeniCinsiyet};
      if(hastaIdDegisti)guncelAlanlar.hasta_id=yeniHastaId;
      const hastaSonuc=await sbUpdate("hastalar",hasta.id,guncelAlanlar);
      if(!hastaSonuc||hastaSonuc.length===0){
        showToast("⚠️ Güncelleme veritabanına yazılamadı (0 satır etkilendi). RLS/yetki kısıtlaması olabilir — lütfen bana bildir.","error");
        return false;
      }
      setHastalar(prev=>prev.map(h=>h.id===hasta.id?{...h,...guncelAlanlar}:h));

      // Bu hastaya ait tüm randevu kayıtlarındaki ad/telefon/cinsiyet/hasta_id bilgisini de güncelle
      // (eski hasta_id varsa ondan eşleştir, yoksa eski isimden eşleştir — eski kayıtlar için)
      const filtre=eskiHastaId
        ?`hasta_id=eq.${encodeURIComponent(eskiHastaId)}`
        :`hasta=eq.${encodeURIComponent(eskiAd)}`;
      const randevuAlanlar={hasta:yeniAd,tel:yeniTel,cinsiyet:yeniCinsiyet};
      if(hastaIdDegisti)randevuAlanlar.hasta_id=yeniHastaId;
      const r=await fetch(`${SB_URL}/rest/v1/randevular?${filtre}`,{
        method:"PATCH",
        headers:{...HDR,"Prefer":"return=representation"},
        body:JSON.stringify(randevuAlanlar)
      });
      if(!r.ok) throw new Error(await r.text());
      const guncellenen=await r.json();
      const guncelIdSet=new Set(guncellenen.map(g=>g.id));
      setRandevular(prev=>prev.map(rr=>guncelIdSet.has(rr.id)?{...rr,...randevuAlanlar}:rr));
      showToast(`Hasta bilgileri güncellendi${guncellenen.length?` (${guncellenen.length} randevu kaydı da güncellendi)`:""}.`);
      return true;
    }catch(e){showToast("Hata: "+e.message,"error");return false;}
  }

  async function hastaEkleDB(ad,tel,cinsiyet="Bayan"){
    try{
      // Önce mevcut hastalar listesinde (state'ten, sorgu atmadan) ara
      const varMi=hastalar.find(h=>h.ad?.toLowerCase().trim()===ad.toLowerCase().trim()&&h.tel?.trim()===tel?.trim());
      if(varMi){
        return varMi;
      }
      // Yoksa yeni kayıt oluştur — ID'yi mevcut state'ten hesapla
      const maxId=hastalar.reduce((max,h)=>{
        const n=parseInt(h.hasta_id||"0");
        return n>max?n:max;
      },0);
      const yeniId=String(maxId+1).padStart(4,"0");
      const [ins]=await sbInsert("hastalar",{ad,tel,cinsiyet,hasta_id:yeniId});
      const yeni={id:ins.id,ad,tel,cinsiyet,hasta_id:yeniId};
      setHastalar(prev=>[...prev,yeni]);
      return yeni;
    } catch(e){showToast("Hata: "+e.message,"error");return null;}
  }


  async function anketDurumGuncelle(id, durum){
    // durum: "onay_verildi" | "izin_vermedi" | "gonderildi"
    try{
      await sbUpdate("randevular",id,{anket_durum:durum});
      setRandevular(prev=>prev.map(r=>r.id===id?{...r,anket_durum:durum}:r));
    } catch(e){showToast("Hata: "+e.message,"error");}
  }

  async function anketGonder(randevu){
    try{
      const token=await anketOlustur(randevu);
      const link=`https://randevuuu.netlify.app/anket/${token}`;
      const unvan=randevu.cinsiyet==="Bay"?"BEY":"HANIM";
      const msg=`🌸 ${(randevu.hasta||"").toUpperCase()} ${unvan} MERHABALAR,\nDr. Duygu Coşkun Özbakır Kliniği olarak hizmet kalitemizi artırmak için görüşlerinize ihtiyaç duyuyoruz.\nSizin için hazırladığımız kısa anketi doldurmak ister misiniz? 🙏\n\n👉 ${link}\n\nAnketimiz yalnızca birkaç dakikanızı alacak ve yanıtlarınız tamamen gizli tutulacaktır.\nKatkınız için şimdiden teşekkür ederiz. 🌸`;
      const tel=(randevu.tel||"").replace(/[^0-9]/g,"").slice(-10);
      if(tel.length===10){
        window.open(`https://wa.me/90${tel}?text=${encodeURIComponent(msg)}`,"_blank");
        await anketDurumGuncelle(randevu.id,"gonderildi");
        showToast("Anket gönderildi!");
      } else {
        showToast("Bu hastanın telefon numarası kayıtlı değil!","error");
      }
    } catch(e){showToast("Hata: "+e.message,"error");}
  }

  async function beklemeyeEkle(veri){
    try{
      const sbData={ad:veri.ad,tel:veri.tel,oda:veri.oda,bolgeler:veri.bolgeler||[],tercih_tarih:veri.tercihTarih||null,tercih_saat:veri.tercihSaat||null,notlar:veri.notlar||"",durum:"bekliyor",kayit_tarih:today(),kayit_saat:nowTime()};
      const [ins]=await sbInsert("bekleme",sbData);
      setBekleme(prev=>[{...sbData,id:ins.id,tercihTarih:sbData.tercih_tarih,tercihSaat:sbData.tercih_saat,kayitTarih:sbData.kayit_tarih,kayitSaat:sbData.kayit_saat},...prev]);
      showToast("Bekleme listesine eklendi.");
    } catch(e){showToast("Hata: "+e.message,"error");}
  }

  async function beklemeSil(id){
    try{
      await sbDelete("bekleme",id);
      setBekleme(prev=>prev.filter(b=>b.id!==id));
      showToast("Silindi.");
    } catch(e){showToast("Hata: "+e.message,"error");}
  }

  async function beklemeyiRandevuyaCevir(b){
    setModal({tip:"yeni",data:{oda:b.oda||"alex",hasta:b.ad,hastaId:null,tarih:seciliTarih,saat:b.tercihSaat||b.tercih_saat||"09:00",bolgeler:b.bolgeler||[]},beklemdeId:b.id});
  }

  async function beklemeRandevuAlindi(id){
    try{
      await sbUpdate("bekleme",id,{durum:"randevuAlindi"});
      setBekleme(prev=>prev.map(b=>b.id===id?{...b,durum:"randevuAlindi"}:b));
    } catch(e){}
  }

  function rolDegistir(yeniRol){
    setAktifRol(yeniRol);
    try{
      setYoneticiKilit(window.localStorage.getItem("kl_yonetici_onay")!=="1");
      setDashboardKilit(window.localStorage.getItem("kl_dashboard_onay")!=="1");
    }catch{setYoneticiKilit(true);setDashboardKilit(false);}
    setAktifSekme("takvim");
  }

  const beklemeSayisi=bekleme.filter(b=>b.durum==="bekliyor").length;
  const gunIciSayisi=gunIciLog.filter(g=>(g.degTarih||g.deg_tarih)===today()).length;

  // Giriş yapılmamışsa login ekranı
  if(!aktifKullanici) return <GirisEkrani onGiris={kullaniciGiris}/>;
  const aktifLoginName=aktifKullanici.login_name||"";

  if(yukleniyor) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',system-ui,sans-serif",background:"#f5f4f1"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:12}}>⏳</div>
        <div style={{fontSize:16,fontWeight:500,color:"#555"}}>Veriler yükleniyor...</div>
        <div style={{fontSize:13,color:"#aaa",marginTop:4}}>Supabase bağlantısı kuruluyor</div>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#f5f4f1",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
      <header style={{background:"#1a1a2e",color:"#fff",padding:"0 1.5rem"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:28,height:28,background:"linear-gradient(135deg,#a78bfa,#60a5fa)",borderRadius:8}}/>
            <span style={{fontWeight:600,fontSize:15}}>LazerKlinik</span>
            <span style={{opacity:0.3,fontSize:13,marginLeft:4}}>Randevu Sistemi</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#fff",textTransform:"capitalize"}}>{aktifLoginName}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{ROLLER[aktifRol]||aktifRol}</div>
            </div>
            <button onClick={async()=>{
              const yeniSifre=window.prompt("Yeni şifrenizi girin (en az 6 karakter):");
              if(!yeniSifre||yeniSifre.length<6){if(yeniSifre!==null)alert("Şifre en az 6 karakter olmalı!");return;}
              const tekrar=window.prompt("Şifreyi tekrar girin:");
              if(yeniSifre!==tekrar){alert("Şifreler eşleşmiyor!");return;}
              try{
                const r=await fetch(SB_URL+"/auth/v1/user",{
                  method:"PUT",
                  headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+(aktifKullanici?.token||"")},
                  body:JSON.stringify({password:yeniSifre})
                });
                if(r.ok){alert("Şifreniz başarıyla değiştirildi!");}
                else{alert("Şifre değiştirilemedi. Tekrar giriş yapıp deneyin.");}
              }catch(e){alert("Hata: "+e.message);}
            }} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>🔑 Şifre</button>
            <button onClick={cikisYap} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Çıkış</button>
          </div>
        </div>
      </header>
      <nav style={{background:"#fff",borderBottom:"1px solid #e8e6e0",padding:"0 1.5rem"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex"}}>
          {[["takvim","📅 Takvim",0],["hastalar","👤 Hastalar",0],["bekleme","⏳ Bekleme",beklemeSayisi],
            ...(aktifRol==="yonetici"||aktifRol==="sorumlu"?[["rapor","📊 Rapor",0]]:[]),
            ...(aktifRol==="yonetici"?[["log","📋 Log",gunIciSayisi]]:[]),
            ["anket_sonuc","📊 Anket Sonuçları",0],
            ["gelmeyenler","🚫 Gelmeyenler",0],
            ["dashboard","📅 Boş Randevular",0]]
            .map(([k,l,badge])=>(
            <button key={k} onClick={()=>{
              if((k==="log"||k==="rapor")&&yoneticiKilit){setSifreModal(k);}
              else if(k==="anket_sonuc"&&yoneticiKilit&&aktifRol!=="sekreter"){setSifreModal(k);}

              else setAktifSekme(k);
            }} style={{padding:"12px 16px",background:"none",border:"none",borderBottom:aktifSekme===k?"2px solid #6366f1":"2px solid transparent",color:aktifSekme===k?"#6366f1":"#666",fontWeight:aktifSekme===k?600:400,fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
              {l}{(k==="rapor"||k==="log"||(k==="anket_sonuc"&&aktifRol!=="sekreter"))&&yoneticiKilit&&<span style={{fontSize:11,opacity:0.5}}>🔒</span>}{badge>0&&<span style={{background:"#ef4444",color:"#fff",fontSize:11,fontWeight:700,padding:"1px 6px",borderRadius:20}}>{badge}</span>}
            </button>
          ))}
        </div>
      </nav>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"1.25rem 1.5rem"}}>
        {aktifSekme==="takvim"&&<TakvimSekme seciliTarih={seciliTarih} setSeciliTarih={setSeciliTarih} alexR={alexR} sopR={sopR} gunB={gunB} bloklar={bloklar} blokEkle={blokEkle} blokSil={blokSil} randevular={randevular} aktifRol={aktifRol} onYeniRandevu={(oda,saat)=>setModal({tip:"yeni",data:{oda,saat,tarih:seciliTarih}})} onRandevuTikla={r=>setModal({tip:"detay",data:r})} onRandevuDuzenle={r=>setModal({tip:"duzenle",data:r})} onRandevuTasi={randevuTasi} showToast={showToast}/>}
        {aktifSekme==="hastalar"&&<HastalarSekme hastalar={hastalar} hastaEkleDB={hastaEkleDB} hastaGuncelle={hastaGuncelle} aktifRol={aktifRol} showToast={showToast} randevular={randevular} onRandevuDuzenle={r=>setModal({tip:"duzenle",data:r})} onRandevuSil={randevuSil}/>}
        {aktifSekme==="bekleme"&&<BeklemeListesi bekleme={bekleme} aktifRol={aktifRol} showToast={showToast} onRandevuyaCevir={beklemeyiRandevuyaCevir} onSil={beklemeSil} onEkle={beklemeyeEkle}/>}
        {aktifSekme==="rapor"&&<RaporSekme seciliTarih={seciliTarih} randevular={randevular} aktifRol={aktifRol}/>}
        {aktifSekme==="anket_sonuc"&&<AnketSonucSekme aktifRol={aktifRol}/>}
        {aktifSekme==="gelmeyenler"&&<GelmeyenlerSekme randevular={randevular} aktifRol={aktifRol} onDurumGuncelle={durumGuncelle}/>}
        {aktifSekme==="dashboard"&&<DashboardSekme randevular={randevular} bloklar={bloklar} bekleme={bekleme} setSeciliTarih={(t)=>{setSeciliTarih(t);}} setAktifSekme={setAktifSekme} onYeniRandevu={(oda,saat,tarih)=>{setSeciliTarih(tarih);setAktifSekme("takvim");setTimeout(()=>setModal({tip:"yeni",data:{oda,saat,tarih}}),50);}}/>}
        {aktifSekme==="log"&&aktifRol==="yonetici"&&<LogSekme randevular={randevular} silLog={silLog} gunIciLog={gunIciLog}/>}
      </div>
      {modal&&(
        <ModalWrapper onClose={()=>setModal(null)}>
          {modal.tip==="yeni"&&<RandevuForm basData={modal.data} hastalar={hastalar} hastaEkleDB={hastaEkleDB} aktifRol={aktifRol} onKaydet={async(data)=>{const ok=await randevuKaydet(data);if(ok&&modal.beklemdeId)await beklemeRandevuAlindi(modal.beklemdeId);}} onIptal={()=>setModal(null)}/>}
          {modal.tip==="detay"&&<RandevuDetay randevu={modal.data} aktifRol={aktifRol} onDuzenle={()=>setModal({tip:"duzenle",data:modal.data})} onDurumGuncelle={durumGuncelle} onKapat={()=>setModal(null)} onSil={randevuSil} onHastaDuzenle={randevuHastaBilgisiDuzenle} onAnketDurum={anketDurumGuncelle} onAnketGonder={anketGonder} onBolgeGuncelle={bolgeGuncelle}/>}
          {modal.tip==="duzenle"&&<RandevuForm basData={modal.data} hastalar={hastalar} hastaEkleDB={hastaEkleDB} aktifRol={aktifRol} onKaydet={randevuKaydet} onIptal={()=>setModal(null)} duzenleme/>}
        </ModalWrapper>
      )}
      {sifreModal&&<SifreModal hedef={sifreModal} aktifRol={aktifRol} onBasari={()=>{
        if(sifreModal==="dashboard"){setDashboardKilit(true);try{window.localStorage.setItem("kl_dashboard_onay","1");}catch{}}
        else{setYoneticiKilit(false);try{window.localStorage.setItem("kl_yonetici_onay","1");}catch{}}
        setAktifSekme(sifreModal);setSifreModal(null);
      }} onKapat={()=>setSifreModal(null)}/>}
      {toast&&<div style={{position:"fixed",bottom:24,right:24,background:toast.type==="error"?"#dc2626":"#16a34a",color:"#fff",padding:"12px 18px",borderRadius:10,fontSize:14,fontWeight:500,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",maxWidth:340}}>{toast.msg}</div>}
    </div>
  );
}

// ── TAKVİM ───────────────────────────────────────────────────────────────────
function TakvimSekme({seciliTarih,setSeciliTarih,alexR,sopR,gunB,bloklar,blokEkle,blokSil,randevular,aktifRol,onYeniRandevu,onRandevuTikla,showToast,onRandevuDuzenle,onRandevuTasi}){
  const [bosPanel,setBosPanel]=useState(false);
  const [blokPanel,setBlokPanel]=useState(false);
  const [hastaAraPanel,setHastaAraPanel]=useState(false);
  const [drYokPanel,setDrYokPanel]=useState(false);
  const [aktifOda,setAktifOda]=useState("alex");
  const [mobil,setMobil]=useState(typeof window!=="undefined"&&window.innerWidth<680);
  useEffect(()=>{
    const fn=()=>setMobil(window.innerWidth<680);
    window.addEventListener("resize",fn);
    return()=>window.removeEventListener("resize",fn);
  },[]);
  const [kasaPanel,setKasaPanel]=useState(false);
  const [kasaSifre,setKasaSifre]=useState(false);
  const [kumePopup,setKumePopup]=useState(null);
  function prevDay(){setSeciliTarih(addDays(seciliTarih,-1));}
  function nextDay(){setSeciliTarih(addDays(seciliTarih,1));}
  const START=9*60,END=20*60,TOTAL=END-START;
  const STRIP_H=320;

  function ayniHastaBirlestir(liste){
    // Aynı hastanın aynı zaman aralığına denk gelen farklı işlem (bölge) kayıtlarını
    // tek bir görsel karta birleştirir (örn. "Aslı Sıla - Yarım Kol" ve "Aslı Sıla - T.Bacak" aynı saatte ise)
    const items=liste.map(r=>({r,b:timeToMin(r.saat),e:timeToMin(r.saat)+r.sure}));
    const n=items.length,used=new Array(n).fill(false),gruplar=[];
    for(let i=0;i<n;i++){
      if(used[i])continue;
      let grup=[items[i]];used[i]=true;
      let genisledi=true;
      while(genisledi){
        genisledi=false;
        for(let j=0;j<n;j++){
          if(used[j])continue;
          const aday=items[j];
          const cakisiyor=grup.some(g=>g.r.hasta===aday.r.hasta&&aday.b<g.e&&aday.e>g.b);
          if(cakisiyor){grup.push(aday);used[j]=true;genisledi=true;}
        }
      }
      const b=Math.min(...grup.map(g=>g.b)),e=Math.max(...grup.map(g=>g.e));
      const ilk=grup[0].r;
      const bolgelerSeti=[...new Set(grup.flatMap(g=>g.r.bolgeler||[]))];
      gruplar.push({
        id:grup.map(g=>g.r.id).join("-"),
        hasta:ilk.hasta,oda:ilk.oda,
        saat:minToTime(b),sure:e-b,
        bolgeler:bolgelerSeti,
        tel:ilk.tel,
        durum:grup.length===1?ilk.durum:(grup.some(g=>g.r.durum==="Gelmedi")?"Gelmedi":ilk.durum),
        odeme:grup.length===1?ilk.odeme:undefined,
        list:grup.map(g=>g.r).sort((x,y)=>timeToMin(x.saat)-timeToMin(y.saat))
      });
    }
    return gruplar;
  }
  function bosluklariBul(randevular,bloklar){
    const meşgul=[...randevular.map(r=>({b:timeToMin(r.saat),e:timeToMin(r.saat)+r.sure})),...bloklar.map(b=>({b:timeToMin(b.saat),e:timeToMin(b.saat)+b.sure}))].sort((a,b)=>a.b-b.b);
    const bosluklar=[];
    let imlec=START;
    meşgul.forEach(m=>{
      if(m.b>imlec) bosluklar.push({b:imlec,e:m.b});
      imlec=Math.max(imlec,m.e);
    });
    if(imlec<END) bosluklar.push({b:imlec,e:END});
    return bosluklar.filter(bo=>bo.e-bo.b>0);
  }
  function drYokAraligi(oda){
    return bloklar.filter(b=>b.oda===oda&&b.tarih===seciliTarih&&b.baslik==="DR_YOK")
      .map(b=>`${b.saat}-${minToTime(timeToMin(b.saat)+b.sure)}`)
      .join(", ");
  }
  function renderOda(randevular,bloklar,odaId){
    const pazarMi=new Date(seciliTarih+"T00:00:00").getDay()===0;
    const gercekBloklar=bloklar.filter(b=>b.baslik!=="DR_YOK");
    const birlesik=ayniHastaBirlestir(randevular);
    const bosluklar=bosluklariBul(randevular,gercekBloklar);
    const renkOda=odaId==="alex"?"#2d6a35":"#5b3fa0";

    // Tek zaman çizelgesi: randevular + bloklar + boşluklar, hepsi saate göre sıralı (Dr. Yok dahil değil — sadece bilgilendirme amaçlı ayrı gösteriliyor)
    const satirlar=[
      ...birlesik.map(u=>({tip:"randevu",b:timeToMin(u.saat),e:timeToMin(u.saat)+u.sure,veri:u})),
      ...gercekBloklar.map(b=>({tip:"blok",b:timeToMin(b.saat),e:timeToMin(b.saat)+b.sure,veri:b})),
      ...bosluklar.map(bo=>({tip:"bosluk",b:bo.b,e:bo.e,veri:bo})),
    ].sort((a,b)=>a.b-b.b||a.e-b.e);

    const toplamMesgul=satirlar.filter(s=>s.tip!=="bosluk").reduce((s,x)=>s+(x.e-x.b),0);
    const doluluk=Math.round((toplamMesgul/TOTAL)*100);

    return(
      <div>
        {pazarMi?(
          <div style={{fontSize:12,color:"#555",background:"#f2f1ec",border:"1px solid #ddd",borderRadius:8,padding:"7px 12px",marginBottom:10,fontWeight:600}}>
            🌙 Pazar günleri kapalıyız — çalışmıyoruz
          </div>
        ):(
          <div style={{fontSize:11,color:"#888",background:"#fff",border:"1px solid #eee",borderRadius:8,padding:"5px 10px",marginBottom:8,display:"inline-block"}}>
            Bugün: <b style={{color:renkOda}}>%{doluluk} dolu</b> ({Math.floor(toplamMesgul/60)}s {toplamMesgul%60}dk dolu / <b style={{fontSize:13,color:"#333"}}>{Math.floor((TOTAL-toplamMesgul)/60)}s {(TOTAL-toplamMesgul)%60}dk boş</b>)
          </div>
        )}
        <div style={{display:"flex",gap:10}}>
          {/* Doluluk şeridi: orantılı, sadece renk */}
          <div style={{width:14,borderRadius:7,overflow:"hidden",background:"#e9e7e1",display:"flex",flexDirection:"column",height:STRIP_H,flexShrink:0}}>
            {satirlar.map((s,i)=>{
              const sure=s.e-s.b;
              let bg="#e9e7e1",baslik=`${minToTime(s.b)}-${minToTime(s.e)} boş`;
              if(s.tip==="randevu"){bg=renkOda;baslik=`${minToTime(s.b)}-${minToTime(s.e)} ${s.veri.hasta}`;}
              else if(s.tip==="blok"){bg="#888";baslik=`${minToTime(s.b)}-${minToTime(s.e)} ${s.veri.baslik}`;}
              return <div key={i} title={baslik} style={{flexGrow:sure,flexBasis:0,minHeight:sure>0?1:0,background:bg,borderBottom:"1px solid #fff"}}/>;
            })}
          </div>
          {/* Liste */}
          <div style={{flex:1,minWidth:0}}>
            {satirlar.map((s,i)=>{
              if(s.tip==="bosluk"){
                if(pazarMi){
                  return(
                    <div key={"bo"+i} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 2px",marginBottom:5,color:"#aaa",fontSize:11}}>
                      <div style={{flex:1,borderTop:"1px solid #e5e3de"}}/>
                      <div>kapalı</div>
                      <div style={{flex:1,borderTop:"1px solid #e5e3de"}}/>
                    </div>
                  );
                }
                const bosSure=s.e-s.b;
                const bosEtiket=`${bosSure}dk boş · ${minToTime(s.b)}`;
                const uzunMu=bosSure>=60;
                return(
                  <div key={"bo"+i} onClick={()=>onYeniRandevu(odaId,minToTime(s.b))} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",marginBottom:5,borderRadius:6,background:"#fff8dc",cursor:"pointer"}}>
                    <div style={{flex:1,borderTop:"2px dashed #d9c98a"}}/>
                    <span style={{display:"inline-flex",gap:2,flexShrink:0}}>
                      {Array.from({length:dilimSayisiBosluk(bosSure)}).map((_,di)=>(
                        <span key={di} style={{width:5,height:11,background:"#000",opacity:0.55,borderRadius:1}}/>
                      ))}
                    </span>
                    <div style={{color:"#000",fontWeight:700,fontSize:11}}>{uzunMu?`★★ ${bosEtiket} ★★`:bosEtiket}</div>
                    <div style={{flex:1,borderTop:"2px dashed #d9c98a"}}/>
                  </div>
                );
              }
              if(s.tip==="blok"){
                return(
                  <div key={"bl"+i} onClick={()=>{if(window.confirm(`"${s.veri.baslik}" bloğunu sil?`))blokSil(s.veri.id);}} style={{padding:"8px 10px",marginBottom:5,borderRadius:8,background:"repeating-linear-gradient(45deg,#888,#888 4px,#aaa 4px,#aaa 8px)",border:"1px solid #666",cursor:"pointer"}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#fff"}}>🔒 {s.veri.baslik} — {minToTime(s.b)}-{minToTime(s.e)}</div>
                  </div>
                );
              }
              const u=s.veri;
              const renk=islemRenk(u.bolgeler,u.oda,u.durum);
              return(
                <div key={u.id} onClick={()=>{if(u.list.length===1)onRandevuTikla(u.list[0]);else setKumePopup({liste:u.list});}}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",marginBottom:5,borderRadius:8,background:renk.bg,border:`1px solid ${renk.brd}`,cursor:"pointer"}}>
                  {u.tel&&<div style={{width:8,height:8,borderRadius:"50%",background:"#60a5fa",flexShrink:0}}/>}
                  <div style={{fontSize:11,fontWeight:700,color:"#fff",width:42,flexShrink:0}}>{u.saat}</div>
                  <div style={{flex:1,minWidth:0,fontSize:12.5,fontWeight:600,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {u.hasta}
                    {u.list.length>1&&<span style={{fontSize:9,background:"rgba(255,255,255,0.28)",borderRadius:8,padding:"1px 6px",marginLeft:6,fontWeight:700}}>{u.list.length} işlem</span>}
                    {u.bolgeler?.length>0&&<span style={{fontSize:10,color:"rgba(255,255,255,0.8)",marginLeft:6}}>{u.bolgeler.slice(0,3).join(" · ")}{u.bolgeler.length>3?` +${u.bolgeler.length-3}`:""}</span>}
                  </div>
                  <span style={{display:"inline-flex",gap:2,flexShrink:0}}>
                    {Array.from({length:dilimSayisi(u.sure)}).map((_,di)=>(
                      <span key={di} style={{width:5,height:11,background:"rgba(255,255,255,0.9)",borderRadius:1}}/>
                    ))}
                  </span>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.85)",flexShrink:0}}>{u.sure}dk{u.odeme?` · ${u.odeme}`:""}</div>
                  {u.durum&&<span style={{fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>{u.durum==="Gelmedi"?"❌":u.durum==="Kontrol"?"⏳":"✔"}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={prevDay} style={navBtnStyle}>←</button>
          <button onClick={nextDay} style={navBtnStyle}>→</button>
          <button onClick={()=>setSeciliTarih(today())} style={{...navBtnStyle,color:seciliTarih===today()?"#6366f1":"#444",fontWeight:seciliTarih===today()?600:400}}>Bugün</button>
          <div style={{fontWeight:600,fontSize:15}}>{formatDate(seciliTarih)}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input type="date" value={seciliTarih} onChange={e=>setSeciliTarih(e.target.value)} style={{border:"1px solid #ddd",borderRadius:8,padding:"6px 10px",fontSize:13,fontFamily:"inherit"}}/>
          <button onClick={()=>{setHastaAraPanel(p=>!p);setBosPanel(false);setBlokPanel(false);}} style={{...navBtnStyle,background:hastaAraPanel?"#eef0ff":"#f0f0ed",color:hastaAraPanel?"#4338ca":"#444",border:hastaAraPanel?"1px solid #a5b4fc":"1px solid #ddd"}}>👤 Hasta Ara</button>
          <button onClick={()=>{setBosPanel(p=>!p);setBlokPanel(false);setHastaAraPanel(false);}} style={{...navBtnStyle,background:bosPanel?"#eef0ff":"#f0f0ed",color:bosPanel?"#4338ca":"#444",border:bosPanel?"1px solid #a5b4fc":"1px solid #ddd"}}>🔍 Boş Randevu Bul</button>
          {(aktifRol==="yonetici"||aktifRol==="sekreter")&&<button onClick={()=>{setBlokPanel(p=>!p);setBosPanel(false);setHastaAraPanel(false);setDrYokPanel(false);}} style={{...navBtnStyle,background:blokPanel?"#fee2e2":"#f0f0ed",color:blokPanel?"#dc2626":"#444",border:blokPanel?"1px solid #fca5a5":"1px solid #ddd"}}>🔒 Blok Kapat</button>}
          {(aktifRol==="yonetici"||aktifRol==="sekreter")&&<button onClick={()=>{setDrYokPanel(p=>!p);setBosPanel(false);setHastaAraPanel(false);setBlokPanel(false);}} style={{...navBtnStyle,background:drYokPanel?"#fff7ed":"#f0f0ed",color:drYokPanel?"#c2410c":"#444",border:drYokPanel?"1px solid #fed7aa":"1px solid #ddd"}}>🩺 Dr. Yok</button>}
          {(aktifRol==="yonetici"||aktifRol==="sorumlu")&&<button onClick={()=>{if(!kasaSifre){const s=window.prompt("Şifre:");if(s==="SON26"||s==="5555"){setKasaSifre(true);setKasaPanel(p=>!p);setBosPanel(false);setHastaAraPanel(false);setBlokPanel(false);setDrYokPanel(false);}else{alert("Yanlış şifre!");}}else{setKasaPanel(p=>!p);setBosPanel(false);setHastaAraPanel(false);setBlokPanel(false);setDrYokPanel(false);}}} style={{...navBtnStyle,background:kasaPanel?"#fef3c7":"#f0f0ed",color:kasaPanel?"#92400e":"#444",border:kasaPanel?"1px solid #fcd34d":"1px solid #ddd"}}>🔎 Kontrol</button>}
        </div>
      </div>
      {hastaAraPanel&&<HastaAraPanel randevular={randevular} onDuzenle={(r)=>{setHastaAraPanel(false);onRandevuDuzenle(r);}} onKapat={()=>setHastaAraPanel(false)}/>}
      {drYokPanel&&<DrYokPanel bloklar={bloklar} blokEkle={blokEkle} blokSil={blokSil} seciliTarih={seciliTarih} showToast={showToast} onKapat={()=>setDrYokPanel(false)}/>}
      {kasaPanel&&<KasaKontrolPanel gunRandevular={[...alexR,...sopR]} seciliTarih={seciliTarih} onKapat={()=>setKasaPanel(false)}/>}
      {bosPanel&&<BosRandevuPanel randevular={randevular} bloklar={bloklar} setSeciliTarih={setSeciliTarih} onYeniRandevu={onYeniRandevu} onKapat={()=>setBosPanel(false)}/>}
      {blokPanel&&<BlokPanel bloklar={bloklar} blokEkle={blokEkle} blokSil={blokSil} seciliTarih={seciliTarih} showToast={showToast} onKapat={()=>setBlokPanel(false)}/>}
      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        {Object.entries(RENK).filter(([k])=>k!=="blok"&&k!=="gelmedi").map(([k,v])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#666"}}>
            <div style={{width:10,height:10,borderRadius:3,background:v.bg,flexShrink:0}}/>{v.label}
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#666"}}>
          <div style={{width:10,height:10,borderRadius:3,background:"repeating-linear-gradient(45deg,#888,#888 2px,#aaa 2px,#aaa 4px)",flexShrink:0}}/>Blok
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        {[{l:"Alex",v:alexR.length,c:"#2d6a35"},{l:"Soprano",v:sopR.length,c:"#5b3fa0"},{l:"Gelmedi",v:[...alexR,...sopR].filter(r=>r.durum==="Gelmedi").length,c:"#b45309"},{l:"Toplam",v:alexR.length+sopR.length,c:"#555"}]
          .map(s=><div key={s.l} style={{flex:1,background:"#fff",border:"1px solid #e8e6e0",borderRadius:10,padding:"8px 12px"}}><div style={{fontSize:11,color:"#888"}}>{s.l}</div><div style={{fontSize:20,fontWeight:600,color:s.c}}>{s.v}</div></div>)}
      </div>
      {mobil?(
        <>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            {[["alex","🟢 Alex Lazer","#2d6a35"],["soprano","🟣 Soprano / Cilt / Forma","#5b3fa0"]].map(([key,label,color])=>(
              <button key={key} onClick={()=>setAktifOda(key)} style={{flex:1,padding:"10px 14px",borderRadius:10,border:aktifOda===key?`2px solid ${color}`:"1px solid #ddd",background:aktifOda===key?color+"14":"#f7f7f5",color:aktifOda===key?color:"#777",fontWeight:aktifOda===key?700:500,fontSize:13,cursor:"pointer"}}>{label}</button>
            ))}
          </div>
          <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,overflow:"hidden"}}>
            {(()=>{
              const drYokVar=bloklar.some(b=>b.oda===aktifOda&&b.tarih===seciliTarih&&b.baslik==="DR_YOK");
              return drYokVar&&(
                <div style={{padding:"10px 14px",background:"#fff1f0",borderBottom:"1px solid #fecaca"}}>
                  <div style={{fontSize:16,fontWeight:800,color:"#dc2626",display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:20}}>🚫</span>Dr. Yok
                    <span style={{fontWeight:600,fontSize:13,color:"#b91c1c"}}>({drYokAraligi(aktifOda)})</span>
                  </div>
                </div>
              );
            })()}
            <div style={{padding:"12px"}}>
              {aktifOda==="alex"
                ?renderOda(alexR,gunB.filter(b=>b.oda==="alex"),"alex")
                :renderOda(sopR,gunB.filter(b=>b.oda==="soprano"),"soprano")}
            </div>
          </div>
        </>
      ):(
        <div style={{display:"flex",gap:12}}>
          {[["🟢 Alex Lazer","#2d6a35","alex",alexR],["🟣 Soprano / Cilt / Forma","#5b3fa0","soprano",sopR]].map(([label,color,oda,liste])=>{
            const drYokVar=bloklar.some(b=>b.oda===oda&&b.tarih===seciliTarih&&b.baslik==="DR_YOK");
            return(
              <div key={oda} style={{flex:1,background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,overflow:"hidden"}}>
                <div style={{padding:"10px 14px",borderBottom:"2px solid #e8e6e0",background:"#f7f7f5"}}>
                  <span style={{fontSize:13,fontWeight:600,color}}>{label}</span>
                  {drYokVar&&<div style={{fontSize:15,fontWeight:800,color:"#dc2626",marginTop:4,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:18}}>🚫</span>Dr. Yok <span style={{fontWeight:600,fontSize:12,color:"#b91c1c"}}>({drYokAraligi(oda)})</span></div>}
                </div>
                <div style={{padding:"12px"}}>{renderOda(liste,gunB.filter(b=>b.oda===oda),oda)}</div>
              </div>
            );
          })}
        </div>
      )}
      {kumePopup&&(
        <div onClick={()=>setKumePopup(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:"12vh"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,padding:16,width:300,maxHeight:"60vh",overflowY:"auto",boxShadow:"0 10px 40px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontWeight:700,fontSize:14}}>Bu saatteki randevular ({kumePopup.liste.length})</span>
              <span onClick={()=>setKumePopup(null)} style={{cursor:"pointer",color:"#999",fontSize:16,padding:"0 4px"}}>✕</span>
            </div>
            {kumePopup.liste.map(r=>(
              <div key={r.id} onClick={()=>{setKumePopup(null);onRandevuTikla(r);}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 10px",borderRadius:8,marginBottom:6,background:"#f5f4f1",cursor:"pointer"}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{r.hasta}</div>
                  <div style={{fontSize:11,color:"#888"}}>{r.saat} · {r.sure}dk{r.odeme?` · ${r.odeme}`:""}</div>
                </div>
                <span style={{fontSize:11,fontWeight:600,color:r.durum==="Gelmedi"?"#dc2626":r.durum==="Kontrol"?"#b45309":"#16a34a"}}>{r.durum}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── HASTA ARA PANEL ──────────────────────────────────────────────────────────
function HastaAraPanel({randevular,onDuzenle,onKapat}){
  const [filtre,setFiltre]=useState("");
  const sonuclar=filtre.trim().length>=2
    ?randevular.filter(r=>r.hasta?.toLowerCase().includes(filtre.toLowerCase()))
      .sort((a,b)=>a.tarih>b.tarih?1:-1)
    :[];
  return(
    <div style={{background:"#fff",border:"1.5px solid #a5b4fc",borderRadius:12,padding:"1.25rem",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:15,fontWeight:600,color:"#4338ca"}}>🔍 Hasta Randevu Ara</div>
        <button onClick={onKapat} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#aaa"}}>✕</button>
      </div>
      <input autoFocus value={filtre} onChange={e=>setFiltre(e.target.value)} placeholder="Hasta adı yazın..." style={{...inputStyle,marginBottom:12}}/>
      {filtre.trim().length>=2&&sonuclar.length===0&&<div style={{fontSize:13,color:"#aaa",textAlign:"center",padding:16}}>Bu isimde randevu bulunamadı.</div>}
      {sonuclar.length>0&&(
        <div>
          <div style={{fontSize:12,color:"#6366f1",fontWeight:600,marginBottom:8}}>{sonuclar.length} randevu bulundu</div>
          {sonuclar.map(r=>(
            <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#f7f7f5",borderRadius:10,marginBottom:6,gap:10}}>
              <div>
                <div style={{fontWeight:600,fontSize:14}}>{r.hasta}</div>
                <div style={{fontSize:12,color:"#666",marginTop:2}}>
                  📅 {r.tarih} · ⏰ {r.saat} · {r.sure}dk
                  <span style={{marginLeft:8,color:r.oda==="alex"?"#2d6a35":"#5b3fa0",fontWeight:500}}>{r.oda==="alex"?"Alex":"Soprano"}</span>
                </div>
                {r.bolgeler?.length>0&&<div style={{fontSize:11,color:"#aaa",marginTop:2}}>{r.bolgeler.join(" · ")}</div>}
                <div style={{fontSize:11,marginTop:2}}>
                  <span style={{color:r.durum==="Gelmedi"?"#dc2626":r.durum==="Kontrol"?"#b45309":"#16a34a",fontWeight:500}}>{r.durum}</span>
                  {r.odeme&&<span style={{color:"#888",marginLeft:8}}>{r.odeme}</span>}
                </div>
              </div>
              <button onClick={()=>onDuzenle(r)} style={{...btnPrimary,fontSize:12,padding:"6px 14px",whiteSpace:"nowrap"}}>Düzenle</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── DOKTOR YOK PANEL ─────────────────────────────────────────────────────────
function DrYokPanel({bloklar,blokEkle,blokSil,seciliTarih,showToast,onKapat}){
  const [basTarih,setBasTarih]=useState(seciliTarih);
  const [bitTarih,setBitTarih]=useState(seciliTarih);
  const [tumGun,setTumGun]=useState(true);
  const [basSaat,setBasSaat]=useState("09:00");
  const [bitSaat,setBitSaat]=useState("20:00");
  const drYokBloklar=bloklar.filter(b=>b.baslik==="DR_YOK");

  async function ekle(){
    const yeniBloklar=[];
    const s=9*60,e=20*60;
    const sure=tumGun?(e-s):timeToMin(bitSaat)-timeToMin(basSaat);
    const saat=tumGun?"09:00":basSaat;
    let tarih=basTarih;
    while(tarih<=bitTarih){
      yeniBloklar.push({oda:"alex",tarih,saat,sure,baslik:"DR_YOK"});
      yeniBloklar.push({oda:"soprano",tarih,saat,sure,baslik:"DR_YOK"});
      tarih=addDays(tarih,1);
    }
    await blokEkle(yeniBloklar);
    showToast("Doktor yok günleri işaretlendi.");
  }

  return(
    <div style={{background:"#fff",border:"1.5px solid #fed7aa",borderRadius:12,padding:"1.25rem",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:15,fontWeight:600,color:"#c2410c"}}>🩺 Doktor Yok Günleri</div>
        <button onClick={onKapat} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#aaa"}}>✕</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div><Label>Başlangıç Tarihi</Label><input type="date" value={basTarih} onChange={e=>setBasTarih(e.target.value)} style={inputStyle}/></div>
        <div><Label>Bitiş Tarihi</Label><input type="date" value={bitTarih} onChange={e=>setBitTarih(e.target.value)} style={inputStyle}/></div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <button onClick={()=>setTumGun(true)} style={chipStyle(tumGun)}>Tüm Gün</button>
        <button onClick={()=>setTumGun(false)} style={chipStyle(!tumGun)}>Belirli Saatler</button>
      </div>
      {!tumGun&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div><Label>Başlangıç Saati</Label><select value={basSaat} onChange={e=>setBasSaat(e.target.value)} style={inputStyle}>{SAATLER.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
        <div><Label>Bitiş Saati</Label><select value={bitSaat} onChange={e=>setBitSaat(e.target.value)} style={inputStyle}>{SAATLER.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
      </div>}
      <button onClick={ekle} style={{...btnPrimary,background:"#c2410c",marginBottom:14}}>İşaretle</button>
      {drYokBloklar.filter(b=>b.tarih>=today()).length>0&&(
        <div>
          <div style={{fontSize:12,fontWeight:600,color:"#999",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>İşaretli Günler</div>
          {[...new Set(drYokBloklar.filter(b=>b.oda==="alex"&&b.tarih>=today()).map(b=>b.tarih))].sort().map(tarih=>(
            <div key={tarih} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"#fff7ed",borderRadius:8,marginBottom:4,fontSize:13}}>
              <span>🩺 {tarih}</span>
              <button onClick={()=>{drYokBloklar.filter(b=>b.tarih===tarih).forEach(b=>blokSil(b.id));}} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:16}}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── KASA KONTROL PANEL ───────────────────────────────────────────────────────
function KasaKontrolPanel({gunRandevular,seciliTarih,onKapat}){
  const [sonuclar,setSonuclar]=useState(null);
  const [yukleniyor,setYukleniyor]=useState(false);
  const seanslar=gunRandevular.filter(r=>r.durum==="Seans");
  const KASA_URL="https://pwcyawsgjzjcydcisyvy.supabase.co";
  const KASA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3Y3lhd3NnanpqY3lkY2lzeXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDA4MDEsImV4cCI6MjA5NDcxNjgwMX0.gnee9oYsFpxzdb_-H-JtRC2fU0Imj2Dajybt7or9a0Y";

  async function kontrol(){
    setYukleniyor(true);
    const sonuc=[];
    for(const r of seanslar){
      try{
        const res=await fetch(`${KASA_URL}/rest/v1/hastalar?tarih=eq.${seciliTarih}&select=id,ad`,{
          headers:{"Content-Type":"application/json","apikey":KASA_KEY,"Authorization":"Bearer "+KASA_KEY}
        });
        const data=await res.json();
        const kasada=data&&data.some(h=>benzerlik(h.ad||"",r.hasta||"")>=0.7);
        sonuc.push({hasta:r.hasta,oda:r.oda,saat:r.saat,kasada});
      } catch(e){
        sonuc.push({hasta:r.hasta,oda:r.oda,saat:r.saat,kasada:false});
      }
    }
    setSonuclar(sonuc);
    setYukleniyor(false);
  }

  const kasadaVar=sonuclar?.filter(s=>s.kasada)||[];
  const kasadaYok=sonuclar?.filter(s=>!s.kasada)||[];

  return(
    <div style={{background:"#fff",border:"1.5px solid #fcd34d",borderRadius:12,padding:"1.25rem",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:15,fontWeight:600,color:"#92400e"}}>🔎 Kontrol — {seciliTarih}</div>
        <button onClick={onKapat} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#aaa"}}>✕</button>
      </div>
      {seanslar.length===0?(
        <div style={{fontSize:13,color:"#aaa",textAlign:"center",padding:16}}>Bu günde seans kaydı yok.</div>
      ):(
        <>
          <div style={{fontSize:13,color:"#666",marginBottom:12}}>
            Takvimde <strong>{seanslar.length}</strong> seans var.
          </div>
          <button onClick={kontrol} disabled={yukleniyor} style={{...btnPrimary,background:"#92400e",marginBottom:14}}>
            {yukleniyor?"Kontrol ediliyor...":"Kasayı Kontrol Et"}
          </button>
          {sonuclar&&(
            <div>
              {/* İstatistik özeti */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                <div style={{background:"#f7f7f5",borderRadius:8,padding:"8px 12px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:"#888"}}>Takvimde</div>
                  <div style={{fontSize:20,fontWeight:700}}>{seanslar.length}</div>
                </div>
                <div style={{background:"#f0fdf4",borderRadius:8,padding:"8px 12px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:"#16a34a"}}>Kasada ✅</div>
                  <div style={{fontSize:20,fontWeight:700,color:"#16a34a"}}>{kasadaVar.length}</div>
                </div>
                <div style={{background:"#fff0f0",borderRadius:8,padding:"8px 12px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:"#dc2626"}}>Kasada Yok ⚠️</div>
                  <div style={{fontSize:20,fontWeight:700,color:"#dc2626"}}>{kasadaYok.length}</div>
                </div>
              </div>
              {/* 2 sütun görünüm */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {/* Kasada olmayanlar - sol */}
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#dc2626"}}>⚠️ Kasada Yok ({kasadaYok.length})</div>
                    {kasadaYok.length>0&&<button onClick={()=>{
                      const liste=kasadaYok.map(s=>s.hasta+" ("+(s.oda==="alex"?"Alex":"Soprano")+") "+s.saat).join("\n");
                      navigator.clipboard.writeText(liste).then(()=>alert("Panoya kopyalandı!"));
                    }} style={{...btnSecondary,fontSize:10,padding:"3px 8px"}}>📋 Kopyala</button>}
                  </div>
                  {kasadaYok.length===0?<div style={{fontSize:12,color:"#aaa",textAlign:"center",padding:8}}>Hepsi kasada ✅</div>:
                  kasadaYok.map((s,i)=>(
                    <div key={i} style={{padding:"8px 10px",background:"#fff0f0",border:"1px solid #fca5a5",borderRadius:8,marginBottom:4}}>
                      <div style={{fontWeight:600,fontSize:13}}>{s.hasta}</div>
                      <div style={{fontSize:11,color:"#888"}}>{s.oda==="alex"?"🟢":"🟣"} {s.saat}</div>
                    </div>
                  ))}
                </div>
                {/* Kasada olanlar - sağ */}
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:"#16a34a",marginBottom:8}}>✅ Kasada Var ({kasadaVar.length})</div>
                  {kasadaVar.length===0?<div style={{fontSize:12,color:"#aaa",textAlign:"center",padding:8}}>Kasada kayıt yok</div>:
                  kasadaVar.map((s,i)=>(
                    <div key={i} style={{padding:"8px 10px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,marginBottom:4}}>
                      <div style={{fontWeight:600,fontSize:13}}>{s.hasta}</div>
                      <div style={{fontSize:11,color:"#888"}}>{s.oda==="alex"?"🟢":"🟣"} {s.saat}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const navBtnStyle={background:"#f0f0ed",border:"1px solid #ddd",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:14,fontFamily:"inherit"};

// ── BOŞ RANDEVU BUL ──────────────────────────────────────────────────────────
function BosRandevuPanel({randevular,bloklar,setSeciliTarih,onYeniRandevu,onKapat}){
  const [oda,setOda]=useState("alex");const [bolgeler,setBolgeler]=useState([]);const [sure,setSure]=useState(30);
  const [gunFiltre,setGunFiltre]=useState("hepsi");const [saatFiltre,setSaatFiltre]=useState("hepsi");
  const [aralikGun,setAralikGun]=useState(14);const [sonuclar,setSonuclar]=useState(null);
  const bolgeListesi=oda==="alex"?ALEX_BOLGELER:SOPRANO_BOLGELER;
  function toggleBolge(b){const yeni=bolgeler.includes(b)?bolgeler.filter(x=>x!==b):[...bolgeler,b];setBolgeler(yeni);const t=yeni.reduce((s,x)=>s+(BOLGE_SURELER[x]||15),0);if(t>0)setSure(t);}
  function bul(){
    const sonuc=[];
    const baslangic=aralikGun===30?25:0;
    const bitis=aralikGun===30?35:aralikGun;
    for(let i=baslangic;i<bitis;i++){
      const tarih=addDays(today(),i);const dow=dayOfWeek(tarih);
      if(dow===0)continue; // Pazar günleri her zaman atla
      if(gunFiltre==="haftaici"&&dow===6)continue;
      if(gunFiltre==="haftasonu"&&dow!==6)continue;
      const S=9*60,E=20*60;
      for(let t=S;t+sure<=E;t+=15){
        const saat=minToTime(t);const bitis=t+sure;
        if(saatFiltre==="sabah"&&t>=13*60)continue;
        if(saatFiltre==="ogle_sonrasi"&&(t<13*60||t>=17*60))continue;
        if(saatFiltre==="17_sonrasi"&&t<17*60)continue;
        const rc=randevular.filter(r=>r.oda===oda&&r.tarih===tarih).some(r=>{const b=timeToMin(r.saat),e=b+r.sure;return t<e&&bitis>b;});
        const bc=bloklar.filter(b=>b.oda===oda&&b.tarih===tarih).some(b=>{const bb=timeToMin(b.saat),be=bb+b.sure;return t<be&&bitis>bb;});
        if(!rc&&!bc){if(!sonuc.some(s=>s.tarih===tarih&&s.saat===saat))sonuc.push({tarih,saat});if(sonuc.filter(s=>s.tarih===tarih).length>=3)break;}
      }
      if(sonuc.length>=15)break;
    }
    setSonuclar(sonuc);
  }
  function secVeGit(s){setSeciliTarih(s.tarih);onYeniRandevu(oda,s.saat);onKapat();}
  const gruplar={};(sonuclar||[]).forEach(s=>{if(!gruplar[s.tarih])gruplar[s.tarih]=[];gruplar[s.tarih].push(s.saat);});
  return(
    <div style={{background:"#fff",border:"1.5px solid #a5b4fc",borderRadius:12,padding:"1.25rem",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:15,fontWeight:600,color:"#4338ca"}}>🔍 Boş Randevu Bul</div>
        <button onClick={onKapat} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#aaa"}}>✕</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div><Label>Oda</Label><div style={{display:"flex",gap:6}}>{[["alex","Alex"],["soprano","Soprano"]].map(([k,l])=><button key={k} onClick={()=>{setOda(k);setBolgeler([]);}} style={chipStyle(oda===k)}>{l}</button>)}</div></div>
        <div><Label>Süre (dk)</Label><input type="number" min={5} max={240} step={5} value={sure} onChange={e=>setSure(Number(e.target.value))} style={inputStyle}/></div>
      </div>
      <Label>İşlemler</Label>
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>{bolgeListesi.map(b=><button key={b} onClick={()=>toggleBolge(b)} style={chipStyle(bolgeler.includes(b))}>{b}</button>)}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
        <div><Label>Gün</Label><select value={gunFiltre} onChange={e=>setGunFiltre(e.target.value)} style={inputStyle}><option value="hepsi">Tüm günler</option><option value="haftaici">Hafta içi</option><option value="haftasonu">Hafta sonu</option></select></div>
        <div><Label>Saat</Label><select value={saatFiltre} onChange={e=>setSaatFiltre(e.target.value)} style={inputStyle}><option value="hepsi">Tüm saatler</option><option value="sabah">Sabah (09-13)</option><option value="ogle_sonrasi">Öğleden sonra</option><option value="17_sonrasi">17:00 sonrası</option></select></div>
        <div><Label>Kaç gün?</Label><select value={aralikGun} onChange={e=>setAralikGun(Number(e.target.value))} style={inputStyle}><option value={7}>1 hafta</option><option value={14}>2 hafta</option><option value={30}>1 Ay Sonra Randevu</option></select></div>
      </div>
      <button onClick={bul} style={{...btnPrimary,marginBottom:14}}>Boş Randevu Getir</button>
      {sonuclar!==null&&(Object.keys(gruplar).length===0?<div style={{fontSize:13,color:"#888"}}>Bu kriterlerde boş randevu bulunamadı.</div>:(
        <div>
          <div style={{fontSize:12,color:"#6366f1",fontWeight:600,marginBottom:8}}>✅ {sonuclar.length} slot bulundu:</div>
          {Object.entries(gruplar).map(([tarih,saatler])=>(
            <div key={tarih} style={{marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:600,color:"#555",marginBottom:5}}>{formatDateShort(tarih)}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{saatler.map(s=><button key={s} onClick={()=>secVeGit({tarih,saat:s})} style={{padding:"5px 14px",background:"#eef0ff",color:"#4338ca",border:"1.5px solid #a5b4fc",borderRadius:20,fontSize:13,cursor:"pointer",fontWeight:500,fontFamily:"inherit"}}>{s}</button>)}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── BLOK PANEL ───────────────────────────────────────────────────────────────
function BlokPanel({bloklar,blokEkle,blokSil,seciliTarih,showToast,onKapat}){
  const [oda,setOda]=useState("alex");const [baslik,setBaslik]=useState("Öğle Arası");
  const [saat,setSaat]=useState("13:00");const [sure,setSure]=useState(60);const [tekrar,setTekrar]=useState("tek");
  const gunBloklar=bloklar.filter(b=>b.tarih===seciliTarih);
  function ekle(){
    if(!baslik.trim()){showToast("Başlık girin","error");return;}
    const yeniBloklar=[];
    if(tekrar==="tek"){
      const odalar=oda==="ikisi"?["alex","soprano"]:[oda];
      odalar.forEach(o=>yeniBloklar.push({oda:o,tarih:seciliTarih,saat,sure,baslik:baslik.trim()}));
    } else {
      const gun=tekrar==="3ay"||tekrar==="3ayhergün"?90:60;
      for(let i=0;i<gun;i++){
        const t=addDays(seciliTarih,i);const dow=dayOfWeek(t);
        if((tekrar==="haftaici"||tekrar==="3ay")&&(dow===0||dow===6))continue;
        const odalar=oda==="ikisi"?["alex","soprano"]:[oda];
        odalar.forEach(o=>yeniBloklar.push({oda:o,tarih:t,saat,sure,baslik:baslik.trim()}));
      }
    }
    blokEkle(yeniBloklar);
  }
  return(
    <div style={{background:"#fff",border:"1.5px solid #fca5a5",borderRadius:12,padding:"1.25rem",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:15,fontWeight:600,color:"#dc2626"}}>🔒 Blok Kapat</div>
        <button onClick={onKapat} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#aaa"}}>✕</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div><Label>Oda</Label><div style={{display:"flex",gap:6}}>{[["alex","Alex"],["soprano","Soprano"],["ikisi","Her ikisi"]].map(([k,l])=><button key={k} onClick={()=>setOda(k)} style={chipStyle(oda===k)}>{l}</button>)}</div></div>
        <div><Label>Başlık</Label><input value={baslik} onChange={e=>setBaslik(e.target.value)} style={inputStyle}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
        <div><Label>Başlangıç</Label><select value={saat} onChange={e=>setSaat(e.target.value)} style={inputStyle}>{SAATLER.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
        <div><Label>Süre (dk)</Label><input type="number" min={15} max={480} step={15} value={sure} onChange={e=>setSure(Number(e.target.value))} style={inputStyle}/></div>
        <div><Label>Tekrar</Label><select value={tekrar} onChange={e=>setTekrar(e.target.value)} style={inputStyle}><option value="tek">Sadece bugün</option><option value="haftaici">60 gün hafta içi</option><option value="3ay">3 ay hafta içi</option><option value="hergün">60 gün her gün</option><option value="3ayhergün">3 ay her gün</option></select></div>
      </div>
      <button onClick={ekle} style={{...btnPrimary,background:"#dc2626",marginBottom:14}}>Bloğu Ekle</button>
      {/* Mevcut bloklar - Alex */}
      {bloklar.filter(b=>b.oda==="alex"&&b.tarih>=today()).length>0&&(
        <div style={{marginTop:14}}>
          <div style={{fontSize:12,fontWeight:600,color:"#2d6a35",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>🟢 Alex — Gelecek Bloklar</div>
          {bloklar.filter(b=>b.oda==="alex"&&b.tarih>=today()).sort((a,b)=>a.tarih.localeCompare(b.tarih)).slice(0,10).map(b=>(
            <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"#f0fdf4",borderRadius:8,marginBottom:4,fontSize:13,border:"1px solid #bbf7d0"}}>
              <span>{b.tarih} · {b.baslik} · {b.saat} · {b.sure}dk</span>
              <button onClick={()=>{if(window.confirm(`"${b.baslik}" bloğunu sil?`))blokSil(b.id);}} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:16}}>✕</button>
            </div>
          ))}
          {bloklar.filter(b=>b.oda==="alex"&&b.tarih>=today()).length>10&&(
            <div style={{fontSize:12,color:"#888",textAlign:"center"}}>...ve {bloklar.filter(b=>b.oda==="alex"&&b.tarih>=today()).length-10} blok daha</div>
          )}
          <button onClick={()=>{if(window.confirm("Alex'teki TÜM gelecek blokları silmek istiyorsunuz?"))bloklar.filter(b=>b.oda==="alex"&&b.tarih>=today()).forEach(b=>blokSil(b.id));}} style={{...btnSecondary,fontSize:11,padding:"4px 10px",color:"#dc2626",borderColor:"#fca5a5",marginTop:6}}>Alex bloklarını temizle</button>
        </div>
      )}
      {/* Mevcut bloklar - Soprano */}
      {bloklar.filter(b=>b.oda==="soprano"&&b.tarih>=today()).length>0&&(
        <div style={{marginTop:14}}>
          <div style={{fontSize:12,fontWeight:600,color:"#5b3fa0",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>🟣 Soprano — Gelecek Bloklar</div>
          {bloklar.filter(b=>b.oda==="soprano"&&b.tarih>=today()).sort((a,b)=>a.tarih.localeCompare(b.tarih)).slice(0,10).map(b=>(
            <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"#f5f3ff",borderRadius:8,marginBottom:4,fontSize:13,border:"1px solid #c4b5fd"}}>
              <span>{b.tarih} · {b.baslik} · {b.saat} · {b.sure}dk</span>
              <button onClick={()=>{if(window.confirm(`"${b.baslik}" bloğunu sil?`))blokSil(b.id);}} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:16}}>✕</button>
            </div>
          ))}
          {bloklar.filter(b=>b.oda==="soprano"&&b.tarih>=today()).length>10&&(
            <div style={{fontSize:12,color:"#888",textAlign:"center"}}>...ve {bloklar.filter(b=>b.oda==="soprano"&&b.tarih>=today()).length-10} blok daha</div>
          )}
          <button onClick={()=>{if(window.confirm("Soprano'daki TÜM gelecek blokları silmek istiyorsunuz?"))bloklar.filter(b=>b.oda==="soprano"&&b.tarih>=today()).forEach(b=>blokSil(b.id));}} style={{...btnSecondary,fontSize:11,padding:"4px 10px",color:"#dc2626",borderColor:"#fca5a5",marginTop:6}}>Soprano bloklarını temizle</button>
        </div>
      )}
      {/* Bu günün blokları */}
      {gunBloklar.filter(b=>b.baslik!=="DR_YOK").length>0&&(
        <div style={{marginTop:14}}>
          <div style={{fontSize:12,fontWeight:600,color:"#999",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Bu günün blokları</div>
          {gunBloklar.filter(b=>b.baslik!=="DR_YOK").map(b=>(
            <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"#f7f7f5",borderRadius:8,marginBottom:4,fontSize:13}}>
              <span>🔒 {b.baslik} · {b.oda==="alex"?"Alex":"Soprano"} · {b.saat} · {b.sure}dk</span>
              <button onClick={()=>blokSil(b.id)} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:16}}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SÜRE KONTROL ─────────────────────────────────────────────────────────────
function SureKontrol({sure,setSure}){
  const [duz,setDuz]=useState(false);const [gec,setGec]=useState(String(sure));
  useEffect(()=>{setGec(String(sure));},[sure]);
  function onBlur(){const v=parseInt(gec);if(!isNaN(v)&&v>=5&&v<=300)setSure(v);else setGec(String(sure));setDuz(false);}
  return(
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <button onClick={()=>setSure(s=>Math.max(5,s-5))} style={sureBtnStyle}>−</button>
      {duz?<input autoFocus value={gec} onChange={e=>setGec(e.target.value)} onBlur={onBlur} onKeyDown={e=>{if(e.key==="Enter")onBlur();if(e.key==="Escape"){setGec(String(sure));setDuz(false);}}} style={{width:60,textAlign:"center",padding:"5px 6px",border:"1.5px solid #6366f1",borderRadius:7,fontSize:14,fontFamily:"inherit",outline:"none"}}/>
      :<div onClick={()=>setDuz(true)} style={{minWidth:60,textAlign:"center",padding:"5px 6px",border:"1.5px solid #6366f1",borderRadius:7,fontSize:14,fontWeight:600,color:"#4338ca",background:"#eef0ff",cursor:"text",userSelect:"none"}}>{sure} dk</div>}
      <button onClick={()=>setSure(s=>Math.min(300,s+5))} style={sureBtnStyle}>+</button>
    </div>
  );
}
const sureBtnStyle={width:32,height:32,border:"1px solid #ddd",borderRadius:8,background:"#f5f5f2",cursor:"pointer",fontSize:18,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",color:"#444"};

// ── RANDEVU FORM ─────────────────────────────────────────────────────────────
function RandevuForm({basData,hastalar,hastaEkleDB,aktifRol,onKaydet,onIptal,duzenleme}){
  const [oda,setOda]=useState(basData.oda||"alex");
  const [hasta,setHasta]=useState(basData.hasta||"");const [hastaId,setHastaId]=useState(basData.hastaId||null);const [hastaTel,setHastaTel]=useState(basData.tel||"");const [hastaCinsiyet,setHastaCinsiyet]=useState(basData.cinsiyet||"Bayan");
  const [tarih,setTarih]=useState(basData.tarih||today());const [saat,setSaat]=useState(basData.saat||"09:00");
  const [seciliBolgeler,setSeciliBolgeler]=useState(basData.bolgeler||[]);
  const [sure,setSure]=useState(basData.sure||15);const [manuelSure,setManuelSure]=useState(!!basData.sure);
  const [durum,setDurum]=useState(basData.durum||"Seans");const [odeme,setOdeme]=useState(basData.odeme||null);
  const [notlar,setNotlar]=useState(basData.notlar||"");
  const [yeniHasta,setYeniHasta]=useState(false);const [yeniAd,setYeniAd]=useState("");const [yeniTel,setYeniTel]=useState("");
  const [hastaFiltre,setHastaFiltre]=useState("");const [kayitYapiliyor,setKayitYapiliyor]=useState(false);
  const [kasaKontrol,setKasaKontrol]=useState(null);
  const kasaTimerRef=useRef(null);
  const bolgeler=oda==="alex"?ALEX_BOLGELER:SOPRANO_BOLGELER;
  const durumlar=oda==="alex"?DURUMLAR_ALEX:DURUMLAR_SOPRANO;
  useEffect(()=>{if(manuelSure)return;const t=seciliBolgeler.reduce((s,b)=>s+(BOLGE_SURELER[b]||15),0);setSure(durum==="Kontrol"?Math.ceil((t||15)/2):(t||15));},[seciliBolgeler,durum,manuelSure]);
  function handleSureChange(v){setSure(v);setManuelSure(true);}
  function toggleBolge(b){setManuelSure(false);setSeciliBolgeler(prev=>prev.includes(b)?prev.filter(x=>x!==b):[...prev,b]);}
  async function hastaEkle(){
    if(!yeniAd.trim())return;
    const yeni=await hastaEkleDB(yeniAd.trim(),yeniTel.trim(),hastaCinsiyet);
    if(yeni){setHasta(yeni.ad);setHastaId(yeni.id);setHastaTel(yeni.tel||"");setHastaCinsiyet(yeni.cinsiyet||"Bayan");setYeniHasta(false);setYeniAd("");setYeniTel("");}
  }
  async function submit(){
    // Hasta adı yazılmışsa ama listeden seçilmemişse otomatik kaydet
    let aktifHasta=hasta;
    let aktifHastaId=hastaId;
    if(!aktifHasta&&hastaFiltre.trim()){
      aktifHasta=hastaFiltre.trim();
    }
    if(!aktifHasta){alert("Hasta adı girin.");return;}
    if(!hastaTel.trim()&&!hastaId){alert("Telefon numarası zorunludur.");return;}
    if(!hastaCinsiyet){alert("Cinsiyet seçimi zorunludur.");return;}
    if(seciliBolgeler.length===0){alert("En az bir bölge seçin.");return;}
    setKayitYapiliyor(true);
    // Düzenleme modundaysa hasta eklemeye çalışma - sadece yeni randevularda hasta kaydet
    if(!duzenleme&&!hastaId&&aktifHasta.trim()){
      if(hastaTel.trim()){
        const yeni=await hastaEkleDB(aktifHasta.trim(),hastaTel,hastaCinsiyet);
        if(yeni) aktifHastaId=yeni.id;
      }
    }
    await onKaydet({id:basData.id||null,oda,hasta:aktifHasta,hastaId:aktifHastaId,tarih,saat,sure,bolgeler:seciliBolgeler,durum,odeme,notlar,tel:hastaTel,cinsiyet:hastaCinsiyet});
    setKayitYapiliyor(false);
  }
  const filtreliHastalar=hastaFiltre.trim().length>=1?hastalar.filter(h=>h.ad.toLowerCase().includes(hastaFiltre.toLowerCase())||h.hasta_id?.includes(hastaFiltre)||h.tel?.includes(hastaFiltre)):[];
  const otomatikSure=(()=>{const t=seciliBolgeler.reduce((s,b)=>s+(BOLGE_SURELER[b]||15),0);return durum==="Kontrol"?Math.ceil((t||15)/2):(t||15);})();
  const onizlemeRenk=islemRenk(seciliBolgeler,oda,durum);
  return(
    <div>
      <h2 style={modalTitleStyle}>{duzenleme?"Randevu Düzenle":"Yeni Randevu"}</h2>
      <Label>Oda</Label>
      <div style={{display:"flex",gap:8,marginBottom:14}}>{[["alex","🟢 Alex Lazer"],["soprano","🟣 Soprano / Cilt / Forma"]].map(([k,l])=><button key={k} onClick={()=>{setOda(k);setSeciliBolgeler([]);setManuelSure(false);}} style={chipStyle(oda===k)}>{l}</button>)}</div>
      <Label>Hasta</Label>
      {!yeniHasta&&(
        <div style={{marginBottom:14}}>
          <input value={hastaFiltre} onChange={e=>{
            const val=e.target.value;
            setHastaFiltre(val);
            setKasaKontrol(null);
            if(kasaTimerRef.current) clearTimeout(kasaTimerRef.current);
            if(val.trim().length>=2){
              kasaTimerRef.current=setTimeout(async()=>{
                const sonuc=await kasadaHastaVarMi(val.trim());
                setKasaKontrol(sonuc);
              },500);
            }
          }} placeholder="İsim, ID veya telefon ara..." style={inputStyle}/>
          {kasaKontrol!==null&&kasaKontrol.length===0&&hastaFiltre.trim().length>=2&&<div style={{fontSize:12,color:"#dc2626",background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:8,padding:"6px 10px",marginTop:4}}>⚠️ Bu hasta kasada kayıtlı değil!</div>}
          {kasaKontrol!==null&&kasaKontrol.length>0&&<div style={{fontSize:12,color:"#16a34a",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"6px 10px",marginTop:4}}>✅ Kasada kayıtlı.</div>}
          <div style={{maxHeight:130,overflowY:"auto",border:"1px solid #e0e0da",borderRadius:8,marginTop:4}}>
            {filtreliHastalar.map(h=><div key={h.id} onClick={()=>{setHasta(h.ad);setHastaId(h.id);setHastaTel(h.tel||"");setHastaCinsiyet(h.cinsiyet||"Bayan");setHastaFiltre("");}} style={{padding:"7px 12px",cursor:"pointer",background:hastaId===h.id?"#eef0ff":"transparent",borderBottom:"1px solid #f0f0ec",fontSize:14}}><strong>{h.ad}</strong>{h.hasta_id&&<span style={{background:"#6366f1",color:"#fff",fontSize:11,fontWeight:700,padding:"1px 7px",borderRadius:20,marginLeft:8}}>#{h.hasta_id}</span>}{h.tel&&<span style={{color:"#999",marginLeft:8,fontSize:12}}>{h.tel}</span>}</div>)}
          </div>
          {hasta&&(
            <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:6}}>
              <input value={hasta} onChange={e=>setHasta(e.target.value)} style={{...inputStyle,fontSize:13,color:"#4338ca",background:"#eef0ff",border:"1px solid #a5b4fc"}} placeholder="Hasta adını düzenle..."/>
              <input value={hastaTel} onChange={e=>setHastaTel(e.target.value)} style={inputStyle} placeholder="Telefon *"/>
              <div style={{display:"flex",gap:6}}>{["Bayan","Bay"].map(c=><button key={c} onClick={()=>setHastaCinsiyet(c)} style={{...chipStyle(hastaCinsiyet===c),flex:1,fontSize:12}}>{c==="Bayan"?"👩 Bayan":"👨 Bay"}</button>)}</div>
              {hastaTel&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8}}><span style={{fontSize:12,color:"#888"}}>📞</span><a href={`https://wa.me/90${hastaTel.replace(/[^0-9]/g,"").slice(-10)}`} target="_blank" style={{fontSize:14,fontWeight:600,color:"#16a34a",textDecoration:"none"}}>{hastaTel}</a></div>}
            </div>
          )}
          {!hasta&&hastaFiltre.trim().length>=1&&filtreliHastalar.length===0&&(
            <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:6}}>
              <div style={{fontSize:12,color:"#888",padding:"6px 10px",background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8}}>"{hastaFiltre}" listede yok — bilgileri girin:</div>
              <input value={hastaTel} onChange={e=>setHastaTel(e.target.value)} style={inputStyle} placeholder="Telefon *"/>
              <div style={{display:"flex",gap:6}}>{["Bayan","Bay"].map(c=><button key={c} onClick={()=>setHastaCinsiyet(c)} style={{...chipStyle(hastaCinsiyet===c),flex:1,fontSize:12}}>{c==="Bayan"?"👩 Bayan":"👨 Bay"}</button>)}</div>
              <button onClick={()=>{setHasta(hastaFiltre);setHastaFiltre("");}} style={{...chipStyle(true),fontSize:12}}>✓ Bu isimle devam et</button>
            </div>
          )}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div><Label>Tarih</Label><input type="date" value={tarih} onChange={e=>setTarih(e.target.value)} style={inputStyle}/></div>
        <div><Label>Saat</Label><select value={saat} onChange={e=>setSaat(e.target.value)} style={inputStyle}>{SAATLER.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
      </div>
      <Label>Bölgeler</Label>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{bolgeler.map(b=><button key={b} onClick={()=>toggleBolge(b)} style={chipStyle(seciliBolgeler.includes(b))}>{b}</button>)}</div>
      {seciliBolgeler.length>0&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div style={{width:12,height:12,borderRadius:3,background:onizlemeRenk.bg}}/><span style={{fontSize:12,color:"#666"}}>{onizlemeRenk.label}</span></div>}
      <div style={{background:"#f7f7f5",borderRadius:10,padding:"10px 14px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div>
            <Label>Süre</Label>
            {manuelSure&&seciliBolgeler.length>0&&<div style={{fontSize:11,color:"#f59e0b",marginTop:2}}>✎ Manuel · otomatik: {otomatikSure}dk <button onClick={()=>{setManuelSure(false);setSure(otomatikSure);}} style={{marginLeft:6,fontSize:11,color:"#6366f1",background:"none",border:"none",cursor:"pointer",textDecoration:"underline",padding:0}}>Sıfırla</button></div>}
          </div>
          <SureKontrol sure={sure} setSure={handleSureChange}/>
        </div>
      </div>
      <div style={{marginBottom:14}}><Label>Durum</Label><select value={durum} onChange={e=>{setDurum(e.target.value);setManuelSure(false);}} style={inputStyle}>{durumlar.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
      {aktifRol!=="personel"&&<><Label>Ödeme</Label>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>{ODEME_TIPLERI.map(o=><button key={o} onClick={()=>setOdeme(odeme===o?null:o)} style={chipStyle(odeme===o)}>{o}</button>)}</div></>}
      <Label>Notlar</Label>
      <textarea value={notlar} onChange={e=>setNotlar(e.target.value)} rows={2} placeholder="Opsiyonel..." style={{...inputStyle,resize:"vertical"}}/>
      <div style={{display:"flex",gap:8,marginTop:16}}>
        <button onClick={submit} disabled={kayitYapiliyor} style={{...btnPrimary,opacity:kayitYapiliyor?0.7:1}}>{kayitYapiliyor?"Kaydediliyor...":duzenleme?"Güncelle":"Randevu Oluştur"}</button>
        <button onClick={onIptal} style={btnSecondary}>İptal</button>
      </div>
    </div>
  );
}

// ── RANDEVU DETAY ────────────────────────────────────────────────────────────
function RandevuDetay({randevu:r,aktifRol,onDuzenle,onDurumGuncelle,onKapat,onSil,onHastaDuzenle,onAnketDurum,onAnketGonder,onBolgeGuncelle}){
  const [durum,setDurum]=useState(r.durum);const [odeme,setOdeme]=useState(r.odeme);
  const [hastaEdit,setHastaEdit]=useState(false);
  const [yeniHastaAd,setYeniHastaAd]=useState(r.hasta);
  const [yeniHastaTel,setYeniHastaTel]=useState(r.tel||"");
  const [bolgeEdit,setBolgeEdit]=useState(false);
  const [seciliBolgeler,setSeciliBolgeler]=useState(r.bolgeler||[]);
  const durumlar=r.oda==="alex"?DURUMLAR_ALEX:DURUMLAR_SOPRANO;
  const renk=islemRenk(r.bolgeler,r.oda,r.durum);
  const bolgeListesi=r.oda==="alex"?ALEX_BOLGELER:SOPRANO_BOLGELER;
  function toggleBolge(b){setSeciliBolgeler(prev=>prev.includes(b)?prev.filter(x=>x!==b):[...prev,b]);}
  const yeniSure=seciliBolgeler.reduce((s,b)=>s+(BOLGE_SURELER[b]||10),0);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:600,margin:0}}>{r.hasta}</h2>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}><div style={{width:10,height:10,borderRadius:3,background:renk.bg}}/><span style={{fontSize:12,color:"#888"}}>{r.oda==="alex"?"Alex Lazer":"Soprano / Cilt / Forma"}</span></div>
        </div>
        <span style={{background:renk.bg,color:"#fff",fontSize:12,padding:"3px 10px",borderRadius:20,flexShrink:0}}>{r.tarih} · {r.saat}</span>
      </div>
      {hastaEdit&&(
        <div style={{background:"#f7f7f5",borderRadius:10,padding:12,marginBottom:14,border:"1.5px solid #a5b4fc"}}>
          <Label>Hasta Bilgilerini Düzenle</Label>
          <input value={yeniHastaAd} onChange={e=>setYeniHastaAd(e.target.value)} placeholder="Ad Soyad" style={{...inputStyle,marginBottom:8}}/>
          <input value={yeniHastaTel} onChange={e=>setYeniHastaTel(e.target.value)} placeholder="Telefon" style={{...inputStyle,marginBottom:8}}/>
          <div style={{fontSize:11,color:"#888",marginBottom:8}}>Bu bilgiler hastanın tüm geçmiş/gelecek randevu kayıtlarında da güncellenecek.</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>onHastaDuzenle(r,yeniHastaAd,yeniHastaTel)} style={btnPrimary}>Kaydet</button>
            <button onClick={()=>{setHastaEdit(false);setYeniHastaAd(r.hasta);setYeniHastaTel(r.tel||"");}} style={btnSecondary}>İptal</button>
          </div>
        </div>
      )}
      <div style={{background:"#f7f7f5",borderRadius:10,padding:12,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,flex:1}}>{(bolgeEdit?seciliBolgeler:r.bolgeler||[]).map(b=><span key={b} style={{background:"#e8e6ff",color:"#5b5bd6",fontSize:13,padding:"2px 10px",borderRadius:20}}>{b}</span>)}</div>
          {(aktifRol==="yonetici"||aktifRol==="sekreter"||aktifRol==="sorumlu")&&!bolgeEdit&&<button onClick={()=>{setSeciliBolgeler(r.bolgeler||[]);setBolgeEdit(true);}} style={{...btnSecondary,fontSize:11,padding:"3px 8px",flexShrink:0,marginLeft:8}}>✏️ Düzenle</button>}
        </div>
        {bolgeEdit&&(
          <div style={{marginTop:8,marginBottom:8}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
              {bolgeListesi.map(b=><button key={b} onClick={()=>toggleBolge(b)} style={{...chipStyle(seciliBolgeler.includes(b)),fontSize:12,padding:"3px 10px"}}>{b}</button>)}
            </div>
            <div style={{fontSize:12,color:"#6366f1",marginBottom:8}}>Yeni süre: <strong>{yeniSure} dk</strong></div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={async()=>{
                if(onBolgeGuncelle) await onBolgeGuncelle(r.id,seciliBolgeler,yeniSure);
                setBolgeEdit(false);
              }} style={{...btnPrimary,fontSize:12,padding:"5px 14px"}}>Kaydet</button>
              <button onClick={()=>{setSeciliBolgeler(r.bolgeler||[]);setBolgeEdit(false);}} style={{...btnSecondary,fontSize:12,padding:"5px 14px"}}>İptal</button>
            </div>
          </div>
        )}
        <div style={{fontSize:13,color:"#888",marginTop:4}}>Süre: <strong>{bolgeEdit?yeniSure:r.sure} dk</strong></div>
        {r.notlar&&<div style={{fontSize:13,color:"#555",marginTop:6,fontStyle:"italic"}}>"{r.notlar}"</div>}
        {r.tel&&<div style={{marginTop:8,display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8}}>
          <span style={{fontSize:13,color:"#555"}}>📞 {r.tel}</span>
          <button onClick={()=>{
            const ad=r.hasta||"";
            const gunler=["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
            const dt=new Date(r.tarih+"T00:00:00");
            const gun=gunler[dt.getDay()];
            const unvan=r.cinsiyet==="Bay"?"BEY":"HANIM";
            const msg=`🌸 ${ad.toUpperCase()} ${unvan} MERHABALAR,\nBen Fatma, Dr. Duygu Coşkun Özbakır Kliniği'nden yazıyorum.\n${gun} günü saat ${r.saat}'daki lazer randevunuzu hatırlatmak istedim. 😊\nİşlemlerin planlanan şekilde ilerleyebilmesi için randevu saatinizden 5 dakika önce kliniğimizde olmanızı rica ederiz. Geç kalınması durumunda, sonraki randevuların aksamaması adına işlem süresinde kısıtlama gerekebilir.\nYoğun talep nedeniyle randevu planlamalarımızı düzenli sürdürebilmek adına, randevunuzu koruyabilmemiz için gün sonuna kadar dönüş yapmanızı rica ederiz.\nRandevunuza katılacaksanız "Evet", katılamayacaksanız "Hayır" şeklinde dönüş yapmanız yeterlidir. 😊\nAnlayışınız için teşekkür eder, sağlıklı günler dileriz. 🌸\nDr. Duygu Coşkun Özbakır Kliniği`;
            const tel=r.tel.replace(/[^0-9]/g,"").slice(-10);
            window.open(`https://wa.me/90${tel}?text=${encodeURIComponent(msg)}`,"_blank");
          }} style={{marginLeft:"auto",background:"#25d366",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>📱 WhatsApp</button>
        </div>}
      </div>
      <Label>Durum</Label>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>{durumlar.map(d=><button key={d} onClick={()=>setDurum(d)} style={chipStyle(durum===d)}>{d}</button>)}</div>
      {aktifRol!=="personel"&&<><Label>Ödeme</Label>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>{ODEME_TIPLERI.map(o=><button key={o} onClick={()=>setOdeme(odeme===o?null:o)} style={chipStyle(odeme===o)}>{o}</button>)}</div></>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={()=>{onDurumGuncelle(r.id,durum,odeme);onKapat();}} style={btnPrimary}>Kaydet</button>
        {(aktifRol==="sekreter"||aktifRol==="yonetici"||aktifRol==="personel"||aktifRol==="sorumlu")&&<button onClick={onDuzenle} style={btnSecondary}>Düzenle</button>}
        {(aktifRol==="sekreter"||aktifRol==="yonetici"||aktifRol==="personel"||aktifRol==="sorumlu")&&<button onClick={()=>setHastaEdit(true)} style={btnSecondary}>👤 Hasta Bilgilerini Düzenle</button>}
        <button onClick={()=>{if(window.confirm("Bu randevu silinecek. Emin misiniz?"))onSil(r.id);}} style={{...btnSecondary,color:"#dc2626",borderColor:"#dc2626"}}>Sil</button>
        <button onClick={onKapat} style={btnSecondary}>Kapat</button>
      </div>
      {/* Anket Bölümü */}
      {r.durum!=="Gelmedi"&&r.tel&&(
        <div style={{marginTop:14,padding:"12px 14px",background:"#f8faff",border:"1px solid #c7d7f4",borderRadius:10}}>
          <div style={{fontSize:13,fontWeight:600,color:"#3b5bdb",marginBottom:8}}>📋 Memnuniyet Anketi</div>
          {!r.anket_durum&&(
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>onAnketDurum(r.id,"onay_verildi")} style={{...btnPrimary,fontSize:12,padding:"6px 14px",background:"#2f9e44"}}>✅ Onay Verdi</button>
              <button onClick={()=>onAnketDurum(r.id,"izin_vermedi")} style={{...btnSecondary,fontSize:12,padding:"6px 14px",color:"#e03131",borderColor:"#ffa8a8"}}>❌ İzin Vermedi</button>
            </div>
          )}
          {r.anket_durum==="onay_verildi"&&(
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:12,color:"#2f9e44",fontWeight:500}}>✅ Onay verildi</span>
              <button onClick={()=>onAnketGonder(r)} style={{...btnPrimary,fontSize:12,padding:"6px 14px",background:"#25d366"}}>📱 Anketi Gönder</button>
            </div>
          )}
          {r.anket_durum==="gonderildi"&&<span style={{fontSize:12,color:"#3b5bdb",fontWeight:500}}>📨 Anket gönderildi</span>}
          {r.anket_durum==="izin_vermedi"&&<span style={{fontSize:12,color:"#e03131",fontWeight:500}}>❌ Hasta izin vermedi</span>}
        </div>
      )}
      {r.durum!=="Gelmedi"&&!r.tel&&(
        <div style={{marginTop:14,padding:"10px 14px",background:"#fff9db",border:"1px solid #ffd43b",borderRadius:10,fontSize:12,color:"#856404"}}>
          ⚠️ Anket göndermek için hastanın telefon numarası gerekli.
        </div>
      )}

      {(r.log||[]).length>0&&(
        <div style={{marginTop:16,borderTop:"1px solid #e8e6e0",paddingTop:12}}>
          <div style={{fontSize:12,fontWeight:600,color:"#999",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>İşlem Geçmişi</div>
          {(r.log||[]).map((l,i)=><div key={i} style={{display:"flex",gap:10,fontSize:12,color:"#666",marginBottom:4}}><span style={{color:"#aaa",minWidth:40}}>{l.saat}</span><span style={{color:"#6366f1",minWidth:60}}>{l.kullanici}</span><span>{l.islem}</span></div>)}
        </div>
      )}
    </div>
  );
}

// ── BEKLEME ──────────────────────────────────────────────────────────────────
function BeklemeListesi({bekleme,aktifRol,showToast,onRandevuyaCevir,onSil,onEkle}){
  const [formAcik,setFormAcik]=useState(false);
  const [ad,setAd]=useState("");const [tel,setTel]=useState("");const [oda,setOda]=useState("alex");
  const [bolgeler,setBolgeler]=useState([]);const [tercihTarih,setTercihTarih]=useState("");
  const [tercihSaat,setTercihSaat]=useState("");const [notlar,setNotlar]=useState("");
  const bolgeListesi=oda==="alex"?ALEX_BOLGELER:SOPRANO_BOLGELER;
  function toggleBolge(b){setBolgeler(prev=>prev.includes(b)?prev.filter(x=>x!==b):[...prev,b]);}
  async function kaydet(){
    if(!ad.trim()||!tel.trim()){showToast("Ad ve telefon zorunlu!","error");return;}
    await onEkle({ad:ad.trim(),tel:tel.trim(),oda,bolgeler,tercihTarih,tercihSaat,notlar});
    setAd("");setTel("");setOda("alex");setBolgeler([]);setTercihTarih("");setTercihSaat("");setNotlar("");setFormAcik(false);
  }
  const bekleyenler=bekleme.filter(b=>b.durum==="bekliyor");
  const alinanlar=bekleme.filter(b=>b.durum==="randevuAlindi");
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div><h2 style={{fontSize:18,fontWeight:600,margin:0}}>Bekleme Listesi</h2><p style={{fontSize:13,color:"#888",margin:"4px 0 0"}}>Boşluk çıktığında aramak için hasta bilgilerini kaydedin</p></div>
        <button onClick={()=>setFormAcik(!formAcik)} style={{...btnPrimary,background:formAcik?"#6b7280":"#6366f1"}}>{formAcik?"İptal":"+ Listeye Ekle"}</button>
      </div>
      {formAcik&&(
        <div style={{background:"#fff",border:"1.5px solid #a5b4fc",borderRadius:12,padding:"1.25rem",marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:600,color:"#4338ca",marginBottom:14}}>📋 Yeni Bekleme Kaydı</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><Label>Ad Soyad *</Label><input value={ad} onChange={e=>setAd(e.target.value)} placeholder="Hasta adı" style={inputStyle}/></div>
            <div><Label>Telefon *</Label><input value={tel} onChange={e=>setTel(e.target.value)} placeholder="0532 ..." style={inputStyle}/></div>
          </div>
          <Label>Oda</Label>
          <div style={{display:"flex",gap:8,marginBottom:12}}>{[["alex","Alex Lazer"],["soprano","Soprano / Cilt / Forma"]].map(([k,l])=><button key={k} onClick={()=>{setOda(k);setBolgeler([]);}} style={chipStyle(oda===k)}>{l}</button>)}</div>
          <Label>İstenen İşlemler</Label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{bolgeListesi.map(b=><button key={b} onClick={()=>toggleBolge(b)} style={chipStyle(bolgeler.includes(b))}>{b}</button>)}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><Label>Tercih Tarih</Label><input type="date" value={tercihTarih} onChange={e=>setTercihTarih(e.target.value)} style={inputStyle}/></div>
            <div><Label>Tercih Saat</Label><select value={tercihSaat} onChange={e=>setTercihSaat(e.target.value)} style={inputStyle}><option value="">Fark etmez</option>{SAATLER.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <Label>Not</Label>
          <textarea value={notlar} onChange={e=>setNotlar(e.target.value)} rows={2} style={{...inputStyle,resize:"vertical",marginBottom:12}}/>
          <div style={{display:"flex",gap:8}}><button onClick={kaydet} style={btnPrimary}>Listeye Ekle</button><button onClick={()=>setFormAcik(false)} style={btnSecondary}>İptal</button></div>
        </div>
      )}
      {bekleyenler.length===0&&!formAcik?(<div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"2.5rem",textAlign:"center",color:"#aaa"}}><div style={{fontSize:32,marginBottom:8}}>⏳</div><div style={{fontSize:15,fontWeight:500}}>Bekleme listesi boş</div></div>):(
        <>
          {bekleyenler.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:13,fontWeight:600,color:"#92400e",background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:8,padding:"8px 12px",marginBottom:10}}>⏳ {bekleyenler.length} kişi bekliyor</div>{bekleyenler.map((b,i)=><BeklemeKarti key={b.id} b={b} onRandevuyaCevir={onRandevuyaCevir} onSil={onSil} aktifRol={aktifRol} siraNo={i+1}/>)}</div>}
          {alinanlar.length>0&&<div><div style={{fontSize:12,fontWeight:600,color:"#999",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Randevu Alınanlar</div>{alinanlar.map(b=><BeklemeKarti key={b.id} b={b} onRandevuyaCevir={onRandevuyaCevir} onSil={onSil} aktifRol={aktifRol}/>)}</div>}
        </>
      )}
    </div>
  );
}
function BeklemeKarti({b,onRandevuyaCevir,onSil,aktifRol,siraNo}){
  const alindi=b.durum==="randevuAlindi";
  const tel=b.tel;const tercihTarih=b.tercihTarih||b.tercih_tarih;const tercihSaat=b.tercihSaat||b.tercih_saat;
  const kayitTarih=b.kayitTarih||b.kayit_tarih||"";
  const kayitTarihFormatli=kayitTarih?new Date(kayitTarih+"T00:00:00").toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"}):"";
  return(
    <div style={{background:"#fff",border:`1px solid ${alindi?"#bbf7d0":"#e8e6e0"}`,borderRadius:12,padding:"14px 16px",marginBottom:8,opacity:alindi?0.75:1}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            {!alindi&&siraNo&&<span style={{background:"#6366f1",color:"#fff",fontSize:12,fontWeight:700,width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{siraNo}</span>}
            <span style={{fontWeight:600,fontSize:15}}>{b.ad}</span>
            <span style={{background:alindi?"#dcfce7":"#fef3c7",color:alindi?"#166534":"#92400e",fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:500}}>{alindi?"✓ Randevu Alındı":`📅 ${kayitTarihFormatli} tarihinde bekleme listesine eklendi`}</span>
          </div>
          <div style={{fontSize:13,color:"#555",marginBottom:6}}>📞 <a href={`tel:${tel}`} style={{color:"#6366f1",textDecoration:"none",fontWeight:500}}>{tel}</a><span style={{color:"#ccc",margin:"0 8px"}}>|</span>{b.oda==="alex"?"Alex Lazer":"Soprano/Cilt/Forma"}</div>
          {b.bolgeler?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>{b.bolgeler.map(bl=><span key={bl} style={{background:"#eef0ff",color:"#4338ca",fontSize:12,padding:"2px 8px",borderRadius:20}}>{bl}</span>)}</div>}
          <div style={{fontSize:12,display:"flex",gap:12,flexWrap:"wrap"}}>
            {tercihTarih&&<span style={{color:"#dc2626",fontWeight:700}}>📅 {tercihTarih}{tercihSaat?` ${tercihSaat}`:""}</span>}
            {b.notlar&&<span style={{color:"#dc2626",fontWeight:700}}>💬 {b.notlar}</span>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
          {!alindi&&aktifRol!=="personel"&&<button onClick={()=>onRandevuyaCevir(b)} style={{...btnPrimary,fontSize:12,padding:"7px 12px",whiteSpace:"nowrap"}}>📅 Randevuya Çevir</button>}
          {aktifRol!=="personel"&&<button onClick={()=>onSil(b.id)} style={{...btnSecondary,fontSize:12,padding:"6px 12px",color:"#dc2626",borderColor:"#fca5a5"}}>Sil</button>}
        </div>
      </div>
    </div>
  );
}

// ── HASTALAR ─────────────────────────────────────────────────────────────────
function HastalarSekme({hastalar,hastaEkleDB,hastaGuncelle,aktifRol,showToast,randevular,onRandevuDuzenle,onRandevuSil}){
  const [filtre,setFiltre]=useState("");
  const [form,setForm]=useState(null);
  const [seciliHasta,setSeciliHasta]=useState(null);
  const [duzenAd,setDuzenAd]=useState("");
  const [duzenTel,setDuzenTel]=useState("");
  const [duzenCinsiyet,setDuzenCinsiyet]=useState("Bayan");
  const [ad,setAd]=useState("");const [tel,setTel]=useState("");const [cinsiyet,setCinsiyet]=useState("Bayan");
  const filtreliHastalar=filtre.trim().length>=1?hastalar.filter(h=>h.ad.toLowerCase().includes(filtre.toLowerCase())||h.tel?.includes(filtre)||h.hasta_id?.includes(filtre)):[];
  async function kaydet(){if(!ad.trim())return;await hastaEkleDB(ad.trim(),tel.trim(),cinsiyet);showToast("Hasta eklendi.");setForm(null);setAd("");setTel("");setCinsiyet("Bayan");}

  const hastaRandevular=seciliHasta?randevular.filter(r=>r.hasta?.toLowerCase().trim()===seciliHasta.ad?.toLowerCase().trim()).sort((a,b)=>a.tarih>b.tarih?1:-1):[];
  const bugun=today();
  const gecmis=hastaRandevular.filter(r=>r.tarih<bugun);
  const gelecek=hastaRandevular.filter(r=>r.tarih>=bugun);

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h2 style={{fontSize:18,fontWeight:600}}>Hasta Listesi ({hastalar.length})</h2>
        {(aktifRol==="sekreter"||aktifRol==="yonetici")&&<button onClick={()=>{setForm("yeni");setAd("");setTel("");setCinsiyet("Bayan");setSeciliHasta(null);}} style={btnPrimary}>+ Yeni Hasta</button>}
      </div>
      <input value={filtre} onChange={e=>setFiltre(e.target.value)} placeholder="İsim, ID veya telefon ile ara..." style={{...inputStyle,marginBottom:12}}/>
      {form==="yeni"&&(
        <div style={{background:"#fff",border:"1px solid #e0ddd5",borderRadius:10,padding:14,marginBottom:12}}>
          <input value={ad} onChange={e=>setAd(e.target.value)} placeholder="Ad Soyad *" style={{...inputStyle,marginBottom:8}}/>
          <input value={tel} onChange={e=>setTel(e.target.value)} placeholder="Telefon" style={{...inputStyle,marginBottom:8}}/>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {["Bayan","Bay"].map(c=><button key={c} onClick={()=>setCinsiyet(c)} style={{...chipStyle(cinsiyet===c),flex:1}}>{c==="Bayan"?"👩 Bayan":"👨 Bay"}</button>)}
          </div>
          <div style={{display:"flex",gap:8}}><button onClick={kaydet} style={btnPrimary}>Kaydet</button><button onClick={()=>setForm(null)} style={btnSecondary}>İptal</button></div>
        </div>
      )}

      {seciliHasta?(
        <div>
          <button onClick={()=>setSeciliHasta(null)} style={{...btnSecondary,marginBottom:12,fontSize:13}}>← Listeye Dön</button>
          <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"1.25rem",marginBottom:14}}>
            <div style={{fontSize:15,fontWeight:600,marginBottom:12,color:"#333"}}>Hasta Bilgileri</div>
            <input value={duzenAd} onChange={e=>setDuzenAd(e.target.value)} style={{...inputStyle,marginBottom:8}}/>
            <input value={duzenTel} onChange={e=>setDuzenTel(e.target.value)} placeholder="Telefon" style={{...inputStyle,marginBottom:8}}/>
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {["Bayan","Bay"].map(c=><button key={c} onClick={()=>setDuzenCinsiyet(c)} style={{...chipStyle(duzenCinsiyet===c),flex:1}}>{c==="Bayan"?"👩 Bayan":"👨 Bay"}</button>)}
            </div>
            {seciliHasta.hasta_id&&<div style={{fontSize:12,color:"#888",marginBottom:8}}>ID: <strong>#{seciliHasta.hasta_id}</strong></div>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={async()=>{
                if(!duzenAd.trim()){showToast("Ad soyad boş olamaz.","error");return;}
                const ok=await hastaGuncelle(seciliHasta,duzenAd.trim(),duzenTel.trim(),duzenCinsiyet);
                if(ok)setSeciliHasta(prev=>({...prev,ad:duzenAd.trim(),tel:duzenTel.trim(),cinsiyet:duzenCinsiyet}));
              }} style={btnPrimary}>Kaydet</button>
              <button onClick={()=>setSeciliHasta(null)} style={btnSecondary}>İptal</button>
            </div>
          </div>

          {gelecek.length>0&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:600,color:"#16a34a",marginBottom:8}}>📅 Gelecek Randevular ({gelecek.length})</div>
              {gelecek.map(r=>(
                <div key={r.id} style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:10,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                  <div>
                    <div style={{fontWeight:500,fontSize:14}}>{r.tarih} · {r.saat}</div>
                    <div style={{fontSize:12,color:"#666"}}>{r.oda==="alex"?"🟢 Alex":"🟣 Soprano"} · {r.sure}dk · {r.durum}</div>
                    {r.bolgeler?.length>0&&<div style={{fontSize:11,color:"#aaa"}}>{r.bolgeler.join(" · ")}</div>}
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <button onClick={()=>onRandevuDuzenle(r)} style={{...btnSecondary,fontSize:12,padding:"5px 12px"}}>Düzenle</button>
                    <button onClick={()=>{if(window.confirm("Bu randevu silinecek. Emin misiniz?"))onRandevuSil(r.id);}} style={{...btnSecondary,fontSize:12,padding:"5px 12px",color:"#dc2626",borderColor:"#dc2626"}}>Sil</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {gecmis.length>0&&(
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#888",marginBottom:8}}>🕐 Geçmiş Randevular ({gecmis.length})</div>
              {gecmis.slice().reverse().map(r=>(
                <div key={r.id} style={{background:"#f7f7f5",border:"1px solid #f0f0ec",borderRadius:10,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,opacity:0.8}}>
                  <div>
                    <div style={{fontWeight:500,fontSize:14,color:"#666"}}>{r.tarih} · {r.saat}</div>
                    <div style={{fontSize:12,color:"#888"}}>{r.oda==="alex"?"🟢 Alex":"🟣 Soprano"} · {r.sure}dk · {r.durum}</div>
                    {r.bolgeler?.length>0&&<div style={{fontSize:11,color:"#bbb"}}>{r.bolgeler.join(" · ")}</div>}
                  </div>
                  <button onClick={()=>{if(window.confirm("Bu randevu silinecek. Emin misiniz?"))onRandevuSil(r.id);}} style={{...btnSecondary,fontSize:12,padding:"5px 12px",color:"#dc2626",borderColor:"#dc2626",flexShrink:0}}>Sil</button>
                </div>
              ))}
            </div>
          )}

          {hastaRandevular.length===0&&<div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"2rem",textAlign:"center",color:"#aaa"}}>Bu hastanın randevusu bulunamadı.</div>}
        </div>
      ):(
        <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,overflow:"hidden"}}>
          {filtreliHastalar.length===0&&<div style={{padding:20,color:"#aaa",textAlign:"center"}}>Hasta bulunamadı.</div>}
          {filtreliHastalar.map((h,i)=>(
            <div key={h.id} onClick={()=>{setSeciliHasta(h);setDuzenAd(h.ad);setDuzenTel(h.tel||"");setDuzenCinsiyet(h.cinsiyet||"Bayan");}} style={{padding:"12px 16px",borderBottom:i<filtreliHastalar.length-1?"1px solid #f0f0ec":"none",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.background="#f7f7f5"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div>
                <div style={{fontWeight:500,fontSize:14}}>{h.ad}</div>
                <div style={{fontSize:12,color:"#999",display:"flex",gap:8}}>
                  {h.tel&&<span>{h.tel}</span>}
                  {h.cinsiyet&&<span>{h.cinsiyet==="Bay"?"👨":"👩"} {h.cinsiyet}</span>}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {h.hasta_id&&<span style={{background:"#6366f1",color:"#fff",fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20}}>#{h.hasta_id}</span>}
                <span style={{color:"#ccc",fontSize:18}}>›</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RAPOR ────────────────────────────────────────────────────────────────────

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function DashboardSekme({randevular,bloklar,bekleme,setSeciliTarih,setAktifSekme,onYeniRandevu}){
  const bugun=today();
  const [offset,setOffset]=useState(0);
  const seciliGun=addDays(bugun,offset);

  function gunBoslukBul(tarih){
    const sonuc={alex:[],soprano:[]};
    ["alex","soprano"].forEach(oda=>{
      const gunR=randevular.filter(r=>r.oda===oda&&r.tarih===tarih).sort((a,b)=>timeToMin(a.saat)-timeToMin(b.saat));
      const gunB=bloklar.filter(b=>b.oda===oda&&b.tarih===tarih);
      const mesgul=[...gunR.map(r=>({b:timeToMin(r.saat),e:timeToMin(r.saat)+r.sure})),...gunB.map(b=>({b:timeToMin(b.saat),e:timeToMin(b.saat)+b.sure}))].sort((a,b)=>a.b-b.b);
      // Pazar günü ise boşluk gösterme
      if(new Date(tarih+"T00:00:00").getDay()===0) return;
      let imlec=9*60;
      mesgul.forEach(m=>{
        if(m.b>imlec+5){sonuc[oda].push({saat:minToTime(imlec),dk:m.b-imlec});}
        imlec=Math.max(imlec,m.e);
      });
      if(imlec<20*60-5) sonuc[oda].push({saat:minToTime(imlec),dk:(20*60)-imlec});
    });
    return sonuc;
  }

  const gunBosluk=gunBoslukBul(seciliGun);

  const bekleyenler=bekleme.filter(b=>b.durum==="bekliyor");
  const tumBosluklar7=Array.from({length:7},(_,i)=>addDays(bugun,i))
    .filter(t=>new Date(t+"T00:00:00").getDay()!==0)
    .flatMap(t=>[
      ...gunBoslukBul(t).alex.map(s=>({tarih:t,oda:"alex",...s})),
      ...gunBoslukBul(t).soprano.map(s=>({tarih:t,oda:"soprano",...s}))
    ]);

  // Haftalık doluluk
  const haftaGunleri=Array.from({length:7},(_,i)=>addDays(bugun,i));
  const haftaDoluluk=haftaGunleri.map(t=>{
    const gunR=randevular.filter(r=>r.tarih===t&&r.durum!=="Gelmedi");
    const toplamDk=gunR.reduce((s,r)=>s+r.sure,0);
    const kapasite=2*(20-9)*60;
    return {tarih:t,yuzde:Math.min(100,Math.round(toplamDk/kapasite*100))};
  });

  const gunAdi=offset===0?"Bugün":offset===1?"Yarın":formatDate(seciliGun);

  return(
    <div>
      <h2 style={{fontSize:18,fontWeight:600,marginBottom:16}}>📅 Boş Randevular</h2>

      {/* Günlük Boşluklar - Kaydırılabilir */}
      <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"1.25rem",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <button onClick={()=>setOffset(o=>Math.max(0,o-1))} disabled={offset===0} style={{background:"none",border:"1px solid #ddd",borderRadius:8,padding:"4px 12px",cursor:offset===0?"not-allowed":"pointer",fontSize:16,color:offset===0?"#ccc":"#444"}}>←</button>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:600,color:"#333"}}>{gunAdi}</div>
            <div style={{fontSize:12,color:"#888"}}>{formatDate(seciliGun)}</div>
          </div>
          <button onClick={()=>setOffset(o=>Math.min(6,o+1))} disabled={offset===6} style={{background:"none",border:"1px solid #ddd",borderRadius:8,padding:"4px 12px",cursor:offset===6?"not-allowed":"pointer",fontSize:16,color:offset===6?"#ccc":"#444"}}>→</button>
        </div>
        {gunBosluk.alex.length===0&&gunBosluk.soprano.length===0?(
          <div style={{fontSize:13,color:"#aaa",textAlign:"center",padding:12}}>Bu gün boşluk yok, tamamen dolu.</div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {gunBosluk.alex.length>0&&(
              <div>
                <div style={{fontSize:12,color:"#2d6a35",fontWeight:600,marginBottom:4}}>🟢 Alex Lazer</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {gunBosluk.alex.map((b,i)=>(
                    <span key={i} onClick={()=>onYeniRandevu("alex",b.saat,seciliGun)} style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:20,padding:"3px 10px",fontSize:12,color:"#166534",cursor:"pointer"}}>
                      {b.saat} · {b.dk}dk +
                    </span>
                  ))}
                </div>
              </div>
            )}
            {gunBosluk.soprano.length>0&&(
              <div>
                <div style={{fontSize:12,color:"#5b3fa0",fontWeight:600,marginBottom:4}}>🟣 Soprano / Cilt</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {gunBosluk.soprano.map((b,i)=>(
                    <span key={i} onClick={()=>onYeniRandevu("soprano",b.saat,seciliGun)} style={{background:"#f5f3ff",border:"1px solid #c4b5fd",borderRadius:20,padding:"3px 10px",fontSize:12,color:"#5b21b6",cursor:"pointer"}}>
                      {b.saat} · {b.dk}dk +
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bekleyenler */}
      <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"1.25rem",marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:600,color:"#666",marginBottom:10}}>⏳ Bekleyenler — Uygun Boşlukla Eşleştirme</div>
        {bekleyenler.length===0?(
          <div style={{fontSize:13,color:"#aaa"}}>Bekleme listesi boş.</div>
        ):(
          (()=>{
            const kullanilanSlotlar=[];
            return bekleyenler.map(b=>{
              const tercihTarih=b.tercihTarih||b.tercih_tarih||"";
              const tercihSaat=b.tercihSaat||b.tercih_saat||"";
              // Tercih kriterlerine göre sırala: önce tercih tarih+saate uyan, sonra en yakın
              const uygunSlotlar=tumBosluklar7.filter(s=>
                s.oda===b.oda&&
                !kullanilanSlotlar.some(k=>k.tarih===s.tarih&&k.saat===s.saat&&k.oda===s.oda)
              );
              // Tercih varsa ona göre sırala
              if(tercihTarih||tercihSaat){
                uygunSlotlar.sort((a,b)=>{
                  const aScore=(tercihTarih&&a.tarih===tercihTarih?0:1)*100+
                    (tercihSaat?Math.abs(timeToMin(a.saat)-timeToMin(tercihSaat||"09:00")):0);
                  const bScore=(tercihTarih&&b.tarih===tercihTarih?0:1)*100+
                    (tercihSaat?Math.abs(timeToMin(b.saat)-timeToMin(tercihSaat||"09:00")):0);
                  return aScore-bScore;
                });
              }
              const uygunSlot=uygunSlotlar[0]||null;
              if(uygunSlot) kullanilanSlotlar.push(uygunSlot);
              return(
                <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#f7f7f5",borderRadius:8,marginBottom:6,gap:8}}>
                  <div>
                    <span style={{fontWeight:500,fontSize:14}}>{b.ad}</span>
                    <span style={{fontSize:12,color:"#888",marginLeft:8}}>{b.oda==="alex"?"🟢 Alex":"🟣 Soprano"}</span>
                  </div>
                  {uygunSlot?(
                    <button onClick={()=>{setSeciliTarih(uygunSlot.tarih);setAktifSekme("takvim");}} style={{...btnPrimary,fontSize:12,padding:"5px 12px",whiteSpace:"nowrap"}}>
                      {uygunSlot.tarih===bugun?"Bugün":uygunSlot.tarih===addDays(bugun,1)?"Yarın":uygunSlot.tarih} {uygunSlot.saat} →
                    </button>
                  ):(
                    <span style={{fontSize:12,color:"#aaa"}}>Uygun slot yok</span>
                  )}
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Haftalık Doluluk */}
      <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"1.25rem"}}>
        <div style={{fontSize:13,fontWeight:600,color:"#666",marginBottom:14}}>📊 Haftalık Doluluk</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:80}}>
          {haftaDoluluk.map((g,i)=>(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer"}} onClick={()=>setOffset(i)}>
              <div style={{fontSize:10,color:"#888"}}>%{g.yuzde}</div>
              <div style={{width:"100%",height:Math.max(g.yuzde*0.6,4),background:i===offset?"#f59e0b":g.yuzde>=80?"#16a34a":g.yuzde>=50?"#6366f1":"#d1d5db",borderRadius:4,border:i===offset?"2px solid #d97706":"none"}}/>
              <div style={{fontSize:10,color:i===offset?"#d97706":"#999",fontWeight:i===offset?600:400}}>{i===0?"Bug.":i===1?"Yar.":formatDate(g.tarih).slice(0,5)}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:"#aaa",marginTop:8,textAlign:"center"}}>Grafikteki güne tıklayınca o günün boşluklarını görebilirsin</div>
      </div>
    </div>
  );
}


// ── GELMEYENLERs ─────────────────────────────────────────────────────────────

// ── ANKET SONUÇLARI ──────────────────────────────────────────────────────────
function AnketSonucSekme({aktifRol}){
  const [anketler,setAnketler]=useState([]);
  const [gunlukRandevular,setGunlukRandevular]=useState([]);
  const [istatistikYukleniyor,setIstatistikYukleniyor]=useState(true);
  const [yukleniyor,setYukleniyor]=useState(true);
  const [filtre,setFiltre]=useState("hepsi"); // "hepsi" | "yuksek" | "dusuk"
  const GOOGLE_LINK="https://g.page/r/CaLNk0c8C9CmEAE/review";
  const LAZER_SORULAR_METIN={s1:"Randevu ve karşılama sürecinden memnun kaldınız mı?",s2:"Personelimizin ilgi ve iletişimini nasıl değerlendirirsiniz?",s3:"İşlem sırasında kendinizi rahat ve güvende hissettiniz mi?",s4:"Mahremiyetinize yeterince özen gösterildiğini düşünüyor musunuz?",s5:"Klinik hijyenini nasıl değerlendirirsiniz?",s6:"İşlem öncesinde yeterince bilgilendirildiniz mi?",s7:"Genel memnuniyet puanı (1-10)",s8:"Tekrar aynı personelden hizmet almak ister misiniz?",s9:"Kliniğimizi yakınlarınıza tavsiye eder misiniz?",s10:"Görüş veya önerileriniz"};
  const CILT_SORULAR_METIN={s1:"İşlem öncesinde size yeterli bilgilendirme yapıldı mı?",s2:"Personelimizin ilgisini ve iletişimini nasıl değerlendirirsiniz?",s3:"İşlem sırasında kendinizi rahat hissettiniz mi?",s4:"Klinik hijyenini nasıl değerlendirirsiniz?",s5:"İşlem sonrasında öneriler ve bakım tavsiyeleri yeterince anlatıldı mı?",s6:"Genel memnuniyet puanı (1-10)",s7:"Aynı personelden tekrar hizmet almak ister misiniz?",s8:"Kliniğimizi yakınlarınıza tavsiye eder misiniz?",s9:"Görüş, öneri veya paylaşmak istediğiniz başka bir konu"};
  function soruMetni(anketTipi,key){const m=anketTipi==="lazer"?LAZER_SORULAR_METIN:CILT_SORULAR_METIN;return m[key]||key;}

  useEffect(()=>{
    async function yukle(){
      try{
        const r=await sbGet("anketler","tamamlandi=eq.true&order=tamamlama_tarih.desc,id.desc");
        setAnketler(r);
      }catch(e){}
      setYukleniyor(false);
    }
    yukle();
    async function yukleRandevu(){
      try{
        const r=await sbGet("randevular","select=id,hasta,tarih,anket_durum,tel");
        setGunlukRandevular(r);
      }catch(e){}
      setIstatistikYukleniyor(false);
    }
    yukleRandevu();
  },[]);

  // Güne göre grupla: toplam hasta (tekil isim) ve anket gönderilen hasta sayısı
  const gunlukIstatistik=(()=>{
    const map=new Map();
    gunlukRandevular.forEach(r=>{
      if(!r.tarih)return;
      if(!map.has(r.tarih))map.set(r.tarih,{tarih:r.tarih,hastalar:new Set(),gonderilen:new Set(),telsiz:new Set()});
      const g=map.get(r.tarih);
      g.hastalar.add(r.hasta);
      if(r.anket_durum==="gonderildi")g.gonderilen.add(r.hasta);
      if(!r.tel)g.telsiz.add(r.hasta);
    });
    return [...map.values()]
      .map(g=>({tarih:g.tarih,toplam:g.hastalar.size,gonderilen:g.gonderilen.size,telsiz:g.telsiz.size}))
      .filter(g=>g.tarih<=today())
      .sort((a,b)=>b.tarih.localeCompare(a.tarih))
      .slice(0,20);
  })();

  const sirali=[...anketler].sort((a,b)=>(b.tamamlama_tarih||"").localeCompare(a.tamamlama_tarih||""));
  const yuksekPuan=sirali.filter(a=>a.puan>=9);
  const dusukPuan=sirali.filter(a=>a.puan<=8&&a.puan>0);
  const gosterilen=filtre==="yuksek"?yuksekPuan:filtre==="dusuk"?dusukPuan:sirali.filter(a=>a.puan>0);
  const sekreterModu=aktifRol==="sekreter";
  const ortalama=anketler.length>0?(anketler.reduce((s,a)=>s+(a.puan||0),0)/anketler.length).toFixed(1):"-";

  function googleGonder(a){
    const msg="Merhaba "+(a.hasta||"değerli hastamız")+", kliniğimize verdiğiniz destek için teşekkür ederiz! Google'da yorum bırakarak diğer hastalarımıza da yardımcı olabilirsiniz 🌸\n\n👉 "+GOOGLE_LINK;
    window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");
  }

  if(yukleniyor) return <div style={{padding:40,textAlign:"center",color:"#aaa"}}>Yükleniyor...</div>;

  return(
    <div>
      <h2 style={{fontSize:18,fontWeight:600,marginBottom:12}}>📊 Anket Sonuçları</h2>

      {!sekreterModu&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={()=>setFiltre("hepsi")} style={{...chipStyle(filtre==="hepsi"),fontSize:13}}>Tümü ({sirali.filter(a=>a.puan>0).length})</button>
        <button onClick={()=>setFiltre("yuksek")} style={{...chipStyle(filtre==="yuksek"),fontSize:13,background:filtre==="yuksek"?"#f0fdf4":undefined,color:filtre==="yuksek"?"#16a34a":undefined,border:filtre==="yuksek"?"1.5px solid #86efac":undefined}}>⭐ 9 ve üstü ({yuksekPuan.length})</button>
        <button onClick={()=>setFiltre("dusuk")} style={{...chipStyle(filtre==="dusuk"),fontSize:13,background:filtre==="dusuk"?"#fff0f0":undefined,color:filtre==="dusuk"?"#dc2626":undefined,border:filtre==="dusuk"?"1.5px solid #fca5a5":undefined}}>📋 8 ve altı ({dusukPuan.length})</button>
      </div>}

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[
          {l:"Toplam Anket",v:anketler.length,c:"#6366f1"},
          {l:"Ortalama Puan",v:ortalama,c:"#16a34a"},
          {l:"8+ Puan (Mutlu)",v:yuksekPuan.length,c:"#f59e0b"},
        ].map(s=>(
          <div key={s.l} style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:11,color:"#888"}}>{s.l}</div>
            <div style={{fontSize:24,fontWeight:700,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,marginBottom:20,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",background:"#f7f7f5",borderBottom:"1px solid #e8e6e0"}}>
          <span style={{fontWeight:600,fontSize:14}}>📅 Günlük Anket Gönderim İstatistiği (bugün dahil son 20 gün)</span>
        </div>
        {istatistikYukleniyor?(
          <div style={{padding:24,textAlign:"center",color:"#aaa",fontSize:13}}>Yükleniyor...</div>
        ):gunlukIstatistik.length===0?(
          <div style={{padding:24,textAlign:"center",color:"#aaa",fontSize:13}}>Veri bulunamadı.</div>
        ):(
          <div style={{maxHeight:340,overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{position:"sticky",top:0,background:"#fbfbfa"}}>
                  <th style={{textAlign:"left",padding:"8px 12px",color:"#888",fontWeight:600,fontSize:11,borderBottom:"1px solid #eee"}}>Tarih</th>
                  <th style={{textAlign:"right",padding:"8px 12px",color:"#888",fontWeight:600,fontSize:11,borderBottom:"1px solid #eee"}}>Toplam Hasta</th>
                  <th style={{textAlign:"right",padding:"8px 12px",color:"#888",fontWeight:600,fontSize:11,borderBottom:"1px solid #eee"}}>Anket Gönderilen</th>
                  <th style={{textAlign:"right",padding:"8px 12px",color:"#888",fontWeight:600,fontSize:11,borderBottom:"1px solid #eee"}}>Oran</th>
                </tr>
              </thead>
              <tbody>
                {gunlukIstatistik.map(g=>{
                  const oran=g.toplam>0?Math.round((g.gonderilen/g.toplam)*100):0;
                  return(
                    <tr key={g.tarih}>
                      <td style={{padding:"7px 12px",borderBottom:"1px solid #f5f5f2"}}>{g.tarih}</td>
                      <td style={{padding:"7px 12px",textAlign:"right",borderBottom:"1px solid #f5f5f2"}}>{g.toplam}</td>
                      <td style={{padding:"7px 12px",textAlign:"right",borderBottom:"1px solid #f5f5f2",color:"#16a34a",fontWeight:600}}>{g.gonderilen}</td>
                      <td style={{padding:"7px 12px",textAlign:"right",borderBottom:"1px solid #f5f5f2",color:oran>=70?"#16a34a":oran>=40?"#b45309":"#dc2626",fontWeight:600}}>%{oran}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(sekreterModu||filtre==="hepsi"||filtre==="yuksek")&&yuksekPuan.length>0&&(
        <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,marginBottom:16,overflow:"hidden"}}>
          <div style={{padding:"12px 16px",background:"#fffbeb",borderBottom:"1px solid #fcd34d",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:600,color:"#92400e"}}>⭐ 9+ Puan Verenler — Google'a Yönlendir</span>
            <span style={{fontSize:12,color:"#888"}}>{yuksekPuan.length} kişi</span>
          </div>
          {yuksekPuan.map((a,i)=>(
            <div key={a.id} style={{padding:"12px 16px",borderBottom:i<yuksekPuan.length-1?"1px solid #f5f5f2":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:6}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14}}>{a.hasta||"Anonim"}</div>
                  <div style={{fontSize:12,color:"#888"}}>{a.tamamlama_tarih} · {a.anket_tipi==="lazer"?"Lazer Epilasyon":"Cilt/Karbon/Tüy"}{a.randevu_tarih&&<span style={{marginLeft:6,color:"#6366f1"}}>| Randevu: {a.randevu_tarih}</span>}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{background:"#f0fdf4",color:"#16a34a",fontWeight:700,fontSize:15,padding:"4px 12px",borderRadius:20}}>⭐ {a.puan}/10</span>
                  <button onClick={()=>googleGonder(a)} style={{...btnPrimary,fontSize:12,padding:"6px 14px",background:"#4285f4",whiteSpace:"nowrap"}}>Google'a Yönlendir</button>
                </div>
              </div>
              {!sekreterModu&&a.cevaplar&&Object.keys(a.cevaplar).length>0&&(
                <div style={{background:"#f0fdf4",borderRadius:8,padding:"8px 10px",fontSize:12,color:"#555"}}>
                  {Object.entries(a.cevaplar).map(([k,v])=>(
                    <div key={k} style={{marginBottom:4}}><strong style={{color:"#555"}}>{soruMetni(a.anket_tipi,k)}</strong><br/><span style={{color:"#333"}}>{String(v)}</span></div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!sekreterModu&&(filtre==="hepsi"||filtre==="dusuk")&&dusukPuan.length>0&&(
        <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"12px 16px",background:"#fff0f0",borderBottom:"1px solid #fca5a5"}}>
            <span style={{fontWeight:600,color:"#dc2626"}}>📋 Geri Bildirim Gerektirenler (8 ve altı)</span>
          </div>
          {dusukPuan.map((a,i)=>(
            <div key={a.id} style={{padding:"12px 16px",borderBottom:i<dusukPuan.length-1?"1px solid #f5f5f2":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontWeight:600,fontSize:14}}>{a.hasta||"Anonim"}</div>
                <span style={{background:"#fee2e2",color:"#dc2626",fontWeight:700,fontSize:15,padding:"4px 12px",borderRadius:20}}>⭐ {a.puan}/10</span>
              </div>
              <div style={{fontSize:12,color:"#888",marginBottom:6}}>{a.tamamlama_tarih} · {a.anket_tipi==="lazer"?"Lazer Epilasyon":"Cilt/Karbon/Tüy"}</div>
              {a.cevaplar&&Object.keys(a.cevaplar).length>0&&(
                <div style={{background:"#f7f7f5",borderRadius:8,padding:"8px 10px",fontSize:12,color:"#555"}}>
                  {Object.entries(a.cevaplar).map(([k,v])=>(
                    <div key={k} style={{marginBottom:4}}><strong style={{color:"#555"}}>{soruMetni(a.anket_tipi,k)}</strong><br/><span style={{color:"#333"}}>{String(v)}</span></div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {anketler.length===0&&(
        <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"3rem",textAlign:"center",color:"#aaa"}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <div style={{fontSize:15,fontWeight:500}}>Henüz tamamlanmış anket yok.</div>
        </div>
      )}
    </div>
  );
}

function GelmeyenlerSekme({randevular,aktifRol,onDurumGuncelle}){
  const [aramaAdi,setAramaAdi]=useState("");
  const bugun=today();
  const dun=addDays(bugun,-1);

  // Tüm "Gelmedi" randevular
  const gelmeyenler=randevular.filter(r=>r.durum==="Gelmedi").sort((a,b)=>b.tarih.localeCompare(a.tarih));

  // İsimle arama modu
  if(aramaAdi.trim().length>=2){
    const hastaGelmeyenler=gelmeyenler.filter(r=>r.hasta?.toLowerCase().includes(aramaAdi.toLowerCase()));
    return(
      <div>
        <h2 style={{fontSize:18,fontWeight:600,marginBottom:16}}>🚫 Gelmeyenler</h2>
        <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center"}}>
          <input value={aramaAdi} onChange={e=>setAramaAdi(e.target.value)} placeholder="Hasta adı ile ara..." style={{...inputStyle,maxWidth:300}}/>
          <button onClick={()=>setAramaAdi("")} style={btnSecondary}>Tümünü Gör</button>
        </div>
        {hastaGelmeyenler.length===0?(
          <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"2rem",textAlign:"center",color:"#aaa"}}>Bu isimde gelmeyen hasta bulunamadı.</div>
        ):(
          <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"12px 16px",background:"#fee2e2",borderBottom:"1px solid #fca5a5"}}>
              <span style={{fontWeight:600,color:"#dc2626"}}>{hastaGelmeyenler[0]?.hasta}</span>
              <span style={{fontSize:13,color:"#888",marginLeft:8}}>toplam <strong>{hastaGelmeyenler.length}</strong> kez gelmedi</span>
            </div>
            {hastaGelmeyenler.map((r,i)=>(
              <div key={r.id} style={{padding:"10px 16px",borderBottom:i<hastaGelmeyenler.length-1?"1px solid #f5f5f2":"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500}}>{r.tarih} · {r.saat}</div>
                  <div style={{fontSize:12,color:"#888"}}>{r.oda==="alex"?"🟢 Alex":"🟣 Soprano"} · {r.sure}dk</div>
                  {r.bolgeler?.length>0&&<div style={{fontSize:11,color:"#bbb"}}>{r.bolgeler.join(" · ")}</div>}
                </div>
                <span style={{background:"#fee2e2",color:"#dc2626",fontSize:12,padding:"2px 8px",borderRadius:20,fontWeight:500}}>Gelmedi</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Aylık görünüm
  const aylar=[...new Set(gelmeyenler.map(r=>r.tarih.slice(0,7)))].sort().reverse();
  const [seciliAy,setSeciliAy]=useState(aylar[0]||bugun.slice(0,7));
  const ayGelmeyenler=gelmeyenler.filter(r=>r.tarih.startsWith(seciliAy));

  // Güne göre grupla
  const gunler={};
  ayGelmeyenler.forEach(r=>{
    if(!gunler[r.tarih])gunler[r.tarih]=[];
    gunler[r.tarih].push(r);
  });

  return(
    <div>
      <h2 style={{fontSize:18,fontWeight:600,marginBottom:16}}>🚫 Gelmeyenler</h2>
      <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
        <input value={aramaAdi} onChange={e=>setAramaAdi(e.target.value)} placeholder="Hasta adı ile ara..." style={{...inputStyle,maxWidth:260}}/>
        <select value={seciliAy} onChange={e=>setSeciliAy(e.target.value)} style={{...inputStyle,width:"auto"}}>
          {aylar.map(ay=>{
            const [y,m]=ay.split("-");
            const ayAdi=new Date(y,m-1,1).toLocaleDateString("tr-TR",{month:"long",year:"numeric"});
            return <option key={ay} value={ay}>{ayAdi}</option>;
          })}
        </select>
        <span style={{fontSize:13,color:"#888"}}>Bu ayda toplam <strong>{ayGelmeyenler.length}</strong> gelmeyen</span>
      </div>

      {Object.keys(gunler).length===0?(
        <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"2rem",textAlign:"center",color:"#aaa"}}>Bu ayda gelmeyen yok.</div>
      ):(
        Object.entries(gunler).sort((a,b)=>b[0].localeCompare(a[0])).map(([tarih,randevular])=>(
          <div key={tarih} style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,marginBottom:10,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",background:"#f7f7f5",borderBottom:"1px solid #e8e6e0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:600,fontSize:14}}>{formatDate(tarih)}</span>
              <div style={{display:"flex",gap:8}}>
                <span style={{background:"#fee2e2",color:"#dc2626",fontSize:12,padding:"2px 8px",borderRadius:20}}>Alex: {randevular.filter(r=>r.oda==="alex").length}</span>
                <span style={{background:"#ede9fe",color:"#5b3fa0",fontSize:12,padding:"2px 8px",borderRadius:20}}>Soprano: {randevular.filter(r=>r.oda==="soprano").length}</span>
              </div>
            </div>
            {randevular.map((r,i)=>(
              <div key={r.id} style={{padding:"10px 16px",borderBottom:i<randevular.length-1?"1px solid #f5f5f2":"none",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                <div>
                  <div style={{fontWeight:500,fontSize:14}}>{r.hasta}</div>
                  <div style={{fontSize:12,color:"#888"}}>{r.oda==="alex"?"🟢 Alex":"🟣 Soprano"} · {r.saat} · {r.sure}dk</div>
                  {r.bolgeler?.length>0&&<div style={{fontSize:11,color:"#bbb"}}>{r.bolgeler.join(" · ")}</div>}
                </div>
                {(tarih===bugun||tarih===dun)&&(
                  <button onClick={()=>{if(window.confirm(`${r.hasta} için durumu "Seans" olarak değiştir?`))onDurumGuncelle(r.id,"Seans",r.odeme);}} style={{...btnSecondary,fontSize:12,padding:"4px 10px",color:"#16a34a",borderColor:"#86efac",whiteSpace:"nowrap",flexShrink:0}}>
                    Düzelt
                  </button>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function benzerlik(s1,s2){
  // Levenshtein distance based similarity
  const a=s1.toUpperCase().replace(/[İI]/g,"I").replace(/[ĞG]/g,"G").replace(/[ŞS]/g,"S").replace(/[ÜU]/g,"U").replace(/[ÖO]/g,"O").replace(/[ÇC]/g,"C");
  const b=s2.toUpperCase().replace(/[İI]/g,"I").replace(/[ĞG]/g,"G").replace(/[ŞS]/g,"S").replace(/[ÜU]/g,"U").replace(/[ÖO]/g,"O").replace(/[ÇC]/g,"C");
  if(a===b) return 1;
  const m=a.length,n=b.length;
  const dp=Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  const dist=dp[m][n];
  const maxLen=Math.max(m,n);
  return maxLen===0?1:(maxLen-dist)/maxLen;
}

function RaporSekme({seciliTarih,randevular,aktifRol}){
  const KASA_URL="https://pwcyawsgjzjcydcisyvy.supabase.co";
  const KASA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3Y3lhd3NnanpqY3lkY2lzeXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDA4MDEsImV4cCI6MjA5NDcxNjgwMX0.gnee9oYsFpxzdb_-H-JtRC2fU0Imj2Dajybt7or9a0Y";
  const [kasaSonuc,setKasaSonuc]=useState(null);
  const [kasaYukleniyor,setKasaYukleniyor]=useState(false);
  const [kasaTarihSecim,setKasaTarihSecim]=useState("ayni");
  const g=randevular.filter(r=>r.tarih===seciliTarih);
  const al=g.filter(r=>r.oda==="alex");const so=g.filter(r=>r.oda==="soprano");
  const gunSeanslar=g.filter(r=>r.durum==="Seans");
  const ertesin=addDays(seciliTarih,1);

  async function kasaKontrolYap(){
    setKasaYukleniyor(true);setKasaSonuc(null);
    const sonuc=[];
    for(const r of gunSeanslar){
      try{
        const tarihler=kasaTarihSecim==="her_ikisi"?[seciliTarih,ertesin]:[seciliTarih];
        let bulundu=false;
        for(const t of tarihler){
          const res=await fetch(`${KASA_URL}/rest/v1/hastalar?tarih=eq.${t}&select=ad`,{
            headers:{"Content-Type":"application/json","apikey":KASA_KEY,"Authorization":"Bearer "+KASA_KEY}
          });
          const data=await res.json();
          if(data&&Array.isArray(data)&&data.some(h=>benzerlik(h.ad||"",r.hasta||"")>=0.7)){bulundu=true;break;}
        }
        sonuc.push({hasta:r.hasta,oda:r.oda,saat:r.saat,kasada:bulundu});
      } catch(e){sonuc.push({hasta:r.hasta,oda:r.oda,saat:r.saat,kasada:false});}
    }
    setKasaSonuc(sonuc);setKasaYukleniyor(false);
  }
  function s(list){return{seans:list.filter(r=>r.durum==="Seans").length,kontrol:list.filter(r=>r.durum==="Kontrol").length,gelmedi:list.filter(r=>r.durum==="Gelmedi").length,nakit:list.filter(r=>r.odeme==="Nakit").length,kart:list.filter(r=>r.odeme==="Kart").length,eft:list.filter(r=>r.odeme==="EFT").length,alinmadi:list.filter(r=>r.odeme==="Ödeme Alınmadı").length,belirsiz:list.filter(r=>!r.odeme&&r.durum!=="Gelmedi").length};}
  const a=s(al),so2=s(so);
  return(
    <div>
      <h2 style={{fontSize:18,fontWeight:600,marginBottom:16}}>Gün Sonu Raporu — {formatDate(seciliTarih)}</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {[["🟢 Alex Lazer",a,"#2d6a35"],["🟣 Soprano / Cilt / Forma",so2,"#5b3fa0"]].map(([title,d,c])=>(
          <div key={title} style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"1.25rem"}}>
            <div style={{fontSize:14,fontWeight:600,color:c,marginBottom:14,paddingBottom:10,borderBottom:"1px solid #f0f0ec"}}>{title}</div>
            <div style={{fontSize:13,fontWeight:600,color:"#666",marginBottom:8}}>Durum</div>
            {[["Seans","seans","#2d6a35"],["Kontrol","kontrol","#b45309"],["Gelmedi","gelmedi","#dc2626"]].map(([l,k,cl])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:14,color:"#555"}}>{l}</span><span style={{fontSize:14,fontWeight:600,color:cl}}>{d[k]}</span></div>))}
            <div style={{borderTop:"1px solid #f0f0ec",marginTop:10,paddingTop:10}}>
              <div style={{fontSize:13,fontWeight:600,color:"#666",marginBottom:8}}>Ödeme</div>
              {[["Nakit","nakit"],["Kart","kart"],["EFT","eft"],["Alınmadı","alinmadi"],["Belirsiz","belirsiz"]].map(([l,k])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:13,color:"#666"}}>{l}</span><span style={{fontSize:13,fontWeight:d[k]>0?600:400,color:d[k]>0?"#333":"#bbb"}}>{d[k]}</span></div>))}
            </div>
            <div style={{background:"#f7f7f5",borderRadius:8,padding:"10px 12px",marginTop:10,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:"#777"}}>Toplam</span><span style={{fontSize:16,fontWeight:700,color:c}}>{d.seans+d.kontrol+d.gelmedi}</span></div>
          </div>
        ))}
      </div>
      {aktifRol!=="sorumlu"&&<div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:14,marginTop:14,fontSize:13,color:"#78350f"}}>
        <strong>⚡ Çapraz Kontrol:</strong> Bugün toplam <strong>{al.filter(r=>r.durum!=="Gelmedi").length+so.filter(r=>r.durum!=="Gelmedi").length}</strong> işlem yapıldı.
      </div>}

      {/* Kasa Karşılaştırması */}
      <div style={{marginTop:16,background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"1.25rem"}}>
        <div style={{fontSize:14,fontWeight:600,color:"#333",marginBottom:12}}>💰 Kasa Karşılaştırması</div>
        <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={()=>setKasaTarihSecim("ayni")} style={{...chipStyle(kasaTarihSecim==="ayni"),fontSize:12}}>Sadece o gün kasada ara</button>
          <button onClick={()=>setKasaTarihSecim("her_ikisi")} style={{...chipStyle(kasaTarihSecim==="her_ikisi"),fontSize:12}}>O gün + ertesi gün kasada ara</button>
          <button onClick={kasaKontrolYap} disabled={kasaYukleniyor||gunSeanslar.length===0} style={{...btnPrimary,fontSize:12,padding:"6px 14px",marginLeft:"auto"}}>
            {kasaYukleniyor?"Kontrol ediliyor...":"Kasayı Kontrol Et"}
          </button>
        </div>
        {gunSeanslar.length===0&&<div style={{fontSize:13,color:"#aaa"}}>Bu günde seans kaydı yok.</div>}
        {kasaSonuc&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#888",marginBottom:8,padding:"0 4px"}}>
              <span>HASTA</span><span>DURUM</span>
            </div>
            {kasaSonuc.map((s,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:s.kasada?"#f0fdf4":"#fff0f0",border:`1px solid ${s.kasada?"#bbf7d0":"#fca5a5"}`,borderRadius:10,marginBottom:6}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14}}>{s.hasta}</div>
                  <div style={{fontSize:12,color:"#888"}}>{s.oda==="alex"?"🟢 Alex":"🟣 Soprano"} · {s.saat}</div>
                </div>
                <div style={{fontSize:20}}>{s.kasada?"✅":"⚠️"}</div>
              </div>
            ))}
            <div style={{marginTop:10,padding:"10px 14px",background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,fontSize:13,color:"#92400e"}}>
              ✅ Kasada: <strong>{kasaSonuc.filter(s=>s.kasada).length}</strong> &nbsp;|&nbsp;
              ⚠️ Kasada yok: <strong>{kasaSonuc.filter(s=>!s.kasada).length}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── LOG ──────────────────────────────────────────────────────────────────────
function LogSekme({randevular,silLog,gunIciLog}){
  const [aktifTab,setAktifTab]=useState("gunici");
  const tumLog=randevular.flatMap(r=>(r.log||[]).map(l=>({...l,hasta:r.hasta,tarih:r.tarih}))).sort((a,b)=>b.saat?.localeCompare(a.saat||"")||0);
  const bugunGunIci=gunIciLog.filter(g=>(g.degTarih||g.deg_tarih)===today());
  // Gün içi silmeler: randevu tarihi = silindiği tarih
  const bugun=today();
  const bugunSilinen=silLog.filter(s=>s.randevu_tarih===bugun&&s.sil_tarih===bugun);
  const ayBaslangic=bugun.slice(0,7);
  const buAySilinen=silLog.filter(s=>s.randevu_tarih&&s.sil_tarih&&s.randevu_tarih===s.sil_tarih&&s.sil_tarih.startsWith(ayBaslangic));
  return(
    <div>
      <h2 style={{fontSize:18,fontWeight:600,marginBottom:14}}>Yönetici Logu</h2>
      <div style={{display:"flex",gap:4,background:"#f0f0ed",padding:4,borderRadius:10,marginBottom:16,width:"fit-content"}}>
        {[["gunici","⚠️ Gün İçi",bugunGunIci.length],["gunicisilme","🚨 Gün İçi Silme",bugunSilinen.length],["islem","📋 İşlem Logu",0],["silme","🗑️ Silme Logu",silLog.length]].map(([k,l,badge])=>(
          <button key={k} onClick={()=>setAktifTab(k)} style={{padding:"7px 14px",border:"none",borderRadius:8,background:aktifTab===k?"#fff":"transparent",color:aktifTab===k?"#333":"#888",fontWeight:aktifTab===k?600:400,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:aktifTab===k?"0 1px 3px rgba(0,0,0,0.1)":"none",whiteSpace:"nowrap"}}>
            {l}{badge>0&&<span style={{background:k==="gunici"?"#f59e0b":"#ef4444",color:"#fff",fontSize:10,fontWeight:700,padding:"1px 5px",borderRadius:20,marginLeft:5}}>{badge}</span>}
          </button>
        ))}
      </div>
      {aktifTab==="gunicisilme"&&(
        <div>
          {bugunSilinen.length>0&&(
            <div style={{background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#dc2626"}}>
              🚨 Bugün randevu günü olan <strong>{bugunSilinen.length}</strong> randevu silindi!
            </div>
          )}
          <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,overflow:"hidden",marginBottom:16}}>
            {bugunSilinen.length===0?<div style={{padding:"2rem",textAlign:"center",color:"#aaa"}}>✅ Bugün randevu günü silinen randevu yok.</div>:
            bugunSilinen.map((s,i)=>(
              <div key={i} style={{padding:"12px 16px",borderBottom:i<bugunSilinen.length-1?"1px solid #f5f5f2":"none",background:"#fff0f0"}}>
                <div style={{fontWeight:600,fontSize:14,color:"#dc2626"}}>{s.hasta||s.hasta_adi}</div>
                <div style={{fontSize:12,color:"#888",marginTop:2}}>
                  {s.randevu_tarih} · {s.randevu_saat} · {s.oda==="alex"?"🟢 Alex":"🟣 Soprano"}
                  {s.kullanic&&<span style={{marginLeft:8}}>Silen: <strong>{s.kullanic}</strong></span>}
                  {s.sil_saat&&<span style={{marginLeft:8,color:"#999"}}>{s.sil_saat}</span>}
                </div>
                {s.bolgeler?.length>0&&<div style={{fontSize:11,color:"#bbb",marginTop:2}}>{s.bolgeler.join(" · ")}</div>}
              </div>
            ))}
          </div>
          <div style={{fontSize:14,fontWeight:600,color:"#555",marginBottom:10}}>📅 Bu Ay Gün İçi Silmeler ({buAySilinen.length})</div>
          <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,overflow:"hidden"}}>
            {buAySilinen.length===0?<div style={{padding:"2rem",textAlign:"center",color:"#aaa"}}>Bu ay gün içi silme yok.</div>:
            buAySilinen.map((s,i)=>(
              <div key={i} style={{padding:"10px 16px",borderBottom:i<buAySilinen.length-1?"1px solid #f5f5f2":"none"}}>
                <div style={{fontWeight:600,fontSize:14}}>{s.hasta||s.hasta_adi}</div>
                <div style={{fontSize:12,color:"#888",marginTop:2}}>
                  {s.randevu_tarih} · {s.randevu_saat}
                  {s.kullanic&&<span style={{marginLeft:8}}>Silen: <strong>{s.kullanic}</strong></span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {aktifTab==="gunici"&&(bugunGunIci.length===0?<div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"2rem",textAlign:"center",color:"#aaa"}}>✅ Bugün gün içi değişiklik yok.</div>:(
        <><div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#92400e"}}>⚠️ Bugün <strong>{bugunGunIci.length}</strong> randevu değiştirildi.</div>
        <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,overflow:"hidden"}}>{bugunGunIci.map((g,i)=>{const es=g.eskiSaat||g.eski_saat;const ys=g.yeniSaat||g.yeni_saat;const esu=g.eskiSure||g.eski_sure;const ysu=g.yeniSure||g.yeni_sure;return(<div key={g.id} style={{padding:"12px 16px",borderBottom:i<bugunGunIci.length-1?"1px solid #f5f5f2":"none",display:"flex",justifyContent:"space-between",gap:10}}><div><div style={{fontWeight:600,fontSize:14,marginBottom:2}}>{g.hasta}</div><div style={{fontSize:12,color:"#666"}}>{g.oda==="alex"?"Alex":"Soprano"} · Saat: <b>{es}</b>→<b>{ys}</b> · Süre: <b>{esu}dk</b>→<b>{ysu}dk</b></div></div><div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:600,color:"#6366f1"}}>{g.kullanic}</div><div style={{fontSize:11,color:"#aaa"}}>{g.degSaat||g.deg_saat}</div></div></div>);})}</div></>
      ))}
      {aktifTab==="islem"&&(<div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,overflow:"hidden"}}>{tumLog.length===0&&<div style={{padding:20,color:"#aaa",textAlign:"center"}}>Log yok.</div>}{tumLog.map((l,i)=>(<div key={i} style={{display:"flex",gap:12,padding:"10px 16px",borderBottom:"1px solid #f5f5f2",fontSize:13}}><span style={{color:"#aaa",minWidth:40}}>{l.saat}</span><span style={{color:"#6366f1",minWidth:70,fontWeight:500}}>{l.kullanici}</span><span style={{color:"#888",minWidth:60}}>{l.hasta}</span><span style={{color:"#444"}}>{l.islem}</span><span style={{marginLeft:"auto",color:"#bbb",fontSize:11}}>{l.tarih}</span></div>))}</div>)}
      {aktifTab==="silme"&&(silLog.length===0?<div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,padding:"2rem",textAlign:"center",color:"#aaa"}}>🗑️ Silinmiş randevu yok.</div>:(
        <><div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#9a3412"}}>⚠️ Toplam <strong>{silLog.length}</strong> randevu silinmiş.</div>
        <div style={{background:"#fff",border:"1px solid #e8e6e0",borderRadius:12,overflow:"hidden"}}>{silLog.map((s,i)=>{const rt=s.randevuTarih||s.randevu_tarih;const rs=s.randevuSaat||s.randevu_saat;const st=s.silTarih||s.sil_tarih;const ss=s.silSaat||s.sil_saat;return(<div key={s.id} style={{padding:"12px 16px",borderBottom:i<silLog.length-1?"1px solid #f5f5f2":"none",display:"flex",justifyContent:"space-between",gap:10}}><div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span style={{fontWeight:600,fontSize:14,color:"#dc2626"}}>{s.hasta}</span><span style={{background:"#fee2e2",color:"#dc2626",fontSize:11,padding:"1px 7px",borderRadius:20}}>Silindi</span></div><div style={{fontSize:12,color:"#666"}}>{s.oda==="alex"?"Alex":"Soprano"} · {rt} {rs} · {s.sure}dk{s.durum?" · "+s.durum:""}{s.odeme?" · "+s.odeme:""}</div>{s.bolgeler?.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:4}}>{s.bolgeler.map(b=><span key={b} style={{background:"#f3f4f6",color:"#6b7280",fontSize:11,padding:"1px 7px",borderRadius:20}}>{b}</span>)}</div>}</div><div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:600,color:"#6366f1"}}>{s.kullanic}</div><div style={{fontSize:11,color:"#aaa"}}>{st} {ss}</div></div></div>);})}</div></>
      ))}
    </div>
  );
}

// ── ŞİFRE MODAL ──────────────────────────────────────────────────────────────
function SifreModal({hedef,aktifRol,onBasari,onKapat}){
  const [sifre,setSifre]=useState("");const [hata,setHata]=useState(false);const [deneme,setDeneme]=useState(0);
  useEffect(()=>{const fn=e=>{if(e.key==="Escape")onKapat();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[]);
  function kontrol(){
    const dogruSifre=hedef==="dashboard"&&aktifRol==="sorumlu"?"5555":hedef==="anket_sonuc"?"SON26":"SON26";
    if(sifre===dogruSifre){setHata(false);onBasari();}else{setHata(true);setDeneme(d=>d+1);setSifre("");}
  }
  const baslik=hedef==="rapor"?"📊 Rapor":hedef==="log"?"📋 Log":hedef==="anket_sonuc"?"📊 Anket Sonuçları":"📅 Boş Randevular";
  return(
    <div onClick={onKapat} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,padding:"2rem",width:"100%",maxWidth:360,boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:36,marginBottom:8}}>🔒</div>
          <div style={{fontSize:17,fontWeight:600,color:"#1a1a2e"}}>{aktifRol==="sorumlu"?"Sorumlu Girişi":"Yönetici Girişi"}</div>
          <div style={{fontSize:13,color:"#888",marginTop:4}}>{baslik} bölümüne erişmek için şifre gerekli</div>
        </div>
        <input autoFocus type="password" value={sifre} onChange={e=>{setSifre(e.target.value);setHata(false);}} onKeyDown={e=>{if(e.key==="Enter")kontrol();}} placeholder="Şifrenizi girin" style={{...inputStyle,textAlign:"center",fontSize:18,letterSpacing:4,border:hata?"1.5px solid #dc2626":"1px solid #ddd",marginBottom:8}}/>
        {hata&&<div style={{fontSize:12,color:"#dc2626",textAlign:"center",marginBottom:10}}>❌ Yanlış şifre{deneme>=3?" — yöneticinize danışın":""}</div>}
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <button onClick={kontrol} style={{...btnPrimary,flex:1}}>Giriş Yap</button>
          <button onClick={onKapat} style={{...btnSecondary,flex:1}}>İptal</button>
        </div>
      </div>
    </div>
  );
}

// ── MODAL ────────────────────────────────────────────────────────────────────
function ModalWrapper({children,onClose}){
  useEffect(()=>{const fn=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[]);
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,padding:"1.5rem",width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        {children}
      </div>
    </div>
  );
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
const Label=({children})=><div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>{children}</div>;
const inputStyle={width:"100%",padding:"9px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:14,fontFamily:"inherit",color:"#333",background:"#fff",outline:"none"};
const chipStyle=a=>({padding:"6px 14px",border:a?"1.5px solid #6366f1":"1px solid #ddd",borderRadius:20,background:a?"#eef0ff":"#fafaf8",color:a?"#4338ca":"#555",fontSize:13,cursor:"pointer",fontWeight:a?500:400,fontFamily:"inherit"});
const btnPrimary={padding:"9px 18px",background:"#6366f1",color:"#fff",border:"none",borderRadius:8,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"};
const btnSecondary={padding:"9px 18px",background:"transparent",color:"#555",border:"1px solid #ddd",borderRadius:8,fontSize:14,cursor:"pointer",fontFamily:"inherit"};
const modalTitleStyle={fontSize:19,fontWeight:600,marginBottom:18};
