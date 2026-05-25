import { useState, useEffect, useCallback } from 'react';

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SB_URL = 'https://ukqfxyarurvrxjtumjfm.supabase.co';
const SB_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcWZ4eWFydXJ2cnhqdHVtamZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MjcxMzYsImV4cCI6MjA5NTIwMzEzNn0.5SpZ5q4B1-qB5IcPFNUCFcxoKJuddThph_A16mE3gMk';
const HDR = {
  'Content-Type': 'application/json',
  apikey: SB_KEY,
  Authorization: 'Bearer ' + SB_KEY,
};

async function sbGet(tablo, params = '') {
  const r = await fetch(`${SB_URL}/rest/v1/${tablo}?${params}&order=id.asc`, {
    headers: { ...HDR, Prefer: 'return=representation' },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function sbInsert(tablo, data) {
  const r = await fetch(`${SB_URL}/rest/v1/${tablo}`, {
    method: 'POST',
    headers: { ...HDR, Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function sbUpdate(tablo, id, data) {
  const r = await fetch(`${SB_URL}/rest/v1/${tablo}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...HDR, Prefer: 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function sbDelete(tablo, id) {
  const r = await fetch(`${SB_URL}/rest/v1/${tablo}?id=eq.${id}`, {
    method: 'DELETE',
    headers: HDR,
  });
  if (!r.ok) throw new Error(await r.text());
}

// ── localStorage (sadece rol ve seçili tarih için) ────────────────────────────
function useLocalStorage(key, init) {
  const [state, setState] = useState(() => {
    try {
      const v = window.localStorage.getItem(key);
      return v ? JSON.parse(v) : init;
    } catch {
      return init;
    }
  });
  const set = useCallback(
    (value) => {
      setState((prev) => {
        const v = typeof value === 'function' ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(v));
        } catch {}
        return v;
      });
    },
    [key]
  );
  return [state, set];
}

// ── SABITLER ──────────────────────────────────────────────────────────────────
const BOLGE_SURELER = {
  'T.Bacak': 30,
  'T.Kol': 15,
  Göbek: 15,
  Sırt: 30,
  Yüz: 15,
  Koltukaltı: 10,
  Genital: 12,
  Ense: 10,
  'Sakal Üstü': 10,
  Boyun: 10,
  Bel: 15,
  'Göğüs Arası': 5,
  Omuz: 15,
  Popo: 15,
  'Koltuk Altı': 10,
  'Karbon Peeling': 30,
  'Cilt Bakımı': 75,
  Forma: 45,
  'Tüy Sarartma': 20,
};
const ISLEM_KATEGORI = {
  'Karbon Peeling': 'cilt',
  'Cilt Bakımı': 'cilt',
  Forma: 'forma',
  'Tüy Sarartma': 'tuysarart',
};
const RENK = {
  alex: { bg: '#2d6a35', brd: '#3d8a47', label: 'Alex Lazer (Yeşil)' },
  soprano: { bg: '#5b3fa0', brd: '#7a55c8', label: 'Soprano Lazer (Mor)' },
  cilt: {
    bg: '#b91c1c',
    brd: '#dc2626',
    label: 'Cilt Bakımı / Karbon (Kırmızı)',
  },
  tuysarart: { bg: '#a07c10', brd: '#c9a020', label: 'Tüy Sarartma (Sarı)' },
  gelmedi: { bg: '#7a3f3f', brd: '#9b5050', label: 'Gelmedi' },
  blok: { bg: '#555', brd: '#777', label: 'Blok' },
};
const SOPRANO_BOLGELER = [
  'T.Bacak',
  'T.Kol',
  'Göbek',
  'Sırt',
  'Yüz',
  'Koltukaltı',
  'Genital',
  'Ense',
  'Sakal Üstü',
  'Boyun',
  'Bel',
  'Göğüs Arası',
  'Omuz',
  'Popo',
  'Karbon Peeling',
  'Cilt Bakımı',
  'Forma',
  'Tüy Sarartma',
];
const ALEX_BOLGELER = [
  'T.Bacak',
  'T.Kol',
  'Göbek',
  'Sırt',
  'Yüz',
  'Koltuk Altı',
  'Genital',
  'Ense',
  'Sakal Üstü',
  'Boyun',
  'Bel',
  'Göğüs Arası',
  'Omuz',
  'Popo',
];
const ODEME_TIPLERI = ['Nakit', 'Kart', 'EFT', 'Ödeme Alınmadı'];
const DURUMLAR_ALEX = ['Seans', 'Kontrol', 'Gelmedi'];
const DURUMLAR_SOPRANO = ['Seans', 'Gelmedi'];
const ROLLER = {
  yonetici: 'Yönetici',
  sekreter: 'Sekreter',
  personel: 'Uygulayıcı',
};

const SAATLER = [];
for (let h = 9; h <= 20; h++)
  for (let m = 0; m < 60; m += 15) {
    if (h === 20 && m > 0) break;
    SAATLER.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minToTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(
    m % 60
  ).padStart(2, '0')}`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function addDays(d, n) {
  const [y, mo, dy] = d.split('-').map(Number);
  const dt = new Date(y, mo - 1, dy);
  dt.setDate(dt.getDate() + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(dt.getDate()).padStart(2, '0')}`;
}
function formatDate(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
function formatDateShort(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('tr-TR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
function nowTime() {
  return new Date().toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
function dayOfWeek(d) {
  return new Date(d + 'T00:00:00').getDay();
}

function islemRenk(bolgeler, oda, durum) {
  if (durum === 'Gelmedi') return RENK.gelmedi;
  if (oda === 'alex') return RENK.alex;
  const kat = ISLEM_KATEGORI[bolgeler?.[0]];
  if (kat === 'cilt') return RENK.cilt;
  if (kat === 'tuysarart') return RENK.tuysarart;
  return RENK.soprano;
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [aktifRol, setAktifRol] = useLocalStorage('kl_rol', 'sekreter');
  const [aktifSekme, setAktifSekme] = useState('takvim');
  const [seciliTarih, setSeciliTarih] = useLocalStorage('kl_tarih', today());
  const [yoneticiKilit, setYoneticiKilit] = useState(true);
  const [sifreModal, setSifreModal] = useState(null);

  // Supabase veriler
  const [randevular, setRandevular] = useState([]);
  const [hastalar, setHastalar] = useState([]);
  const [bekleme, setBekleme] = useState([]);
  const [silLog, setSilLog] = useState([]);
  const [gunIciLog, setGunIciLog] = useState([]);
  const [bloklar, setBloklar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  // İlk yükleme — tüm verileri çek
  useEffect(() => {
    async function yukle() {
      try {
        setYukleniyor(true);
        const [r, h, b, sl, gl, bl] = await Promise.all([
          sbGet('randevular'),
          sbGet('hastalar'),
          sbGet('bekleme'),
          sbGet('sil_log', 'order=id.desc'),
          sbGet('gunici_log', 'order=id.desc'),
          sbGet('bloklar'),
        ]);
        setRandevular(
          r.map((x) => ({ ...x, bolgeler: x.bolgeler || [], log: x.log || [] }))
        );
        setHastalar(h);
        setBekleme(b.map((x) => ({ ...x, bolgeler: x.bolgeler || [] })));
        setSilLog(sl.map((x) => ({ ...x, bolgeler: x.bolgeler || [] })));
        setGunIciLog(gl.map((x) => ({ ...x, bolgeler: x.bolgeler || [] })));
        setBloklar(bl);
      } catch (e) {
        showToast('Veriler yüklenemedi: ' + e.message, 'error');
      } finally {
        setYukleniyor(false);
      }
    }
    yukle();
  }, []);

  const gunR = randevular.filter((r) => r.tarih === seciliTarih);
  const alexR = gunR
    .filter((r) => r.oda === 'alex')
    .sort((a, b) => timeToMin(a.saat) - timeToMin(b.saat));
  const sopR = gunR
    .filter((r) => r.oda === 'soprano')
    .sort((a, b) => timeToMin(a.saat) - timeToMin(b.saat));
  const gunB = bloklar.filter((b) => b.tarih === seciliTarih);

  function cakismaVar(oda, tarih, saat, sure, excludeId = null) {
    const yB = timeToMin(saat),
      yE = yB + sure;
    const rc = randevular
      .filter((r) => r.oda === oda && r.tarih === tarih && r.id !== excludeId)
      .find((r) => {
        const b = timeToMin(r.saat),
          e = b + r.sure;
        return yB < e && yE > b;
      });
    const bc = bloklar
      .filter((b) => b.oda === oda && b.tarih === tarih)
      .find((b) => {
        const bb = timeToMin(b.saat),
          be = bb + b.sure;
        return yB < be && yE > bb;
      });
    if (bc)
      return {
        tip: 'blok',
        mesaj: `⛔ Bu saat bloklu: "${bc.baslik}" (${bc.saat}, ${bc.sure} dk).`,
      };
    if (rc)
      return {
        tip: 'randevu',
        mesaj: `⚠️ Bu saatte ${rc.hasta} adlı hastanın randevusu var (${rc.saat}, ${rc.sure} dk).`,
      };
    return null;
  }

  async function randevuKaydet(data) {
    const cakisma = cakismaVar(
      data.oda,
      data.tarih || seciliTarih,
      data.saat,
      data.sure,
      data.id
    );
    if (cakisma) {
      showToast(cakisma.mesaj, 'error');
      return false;
    }
    const now = nowTime();
    try {
      if (data.id) {
        const eskiR = randevular.find((r) => r.id === data.id);
        const yeniLog = [
          ...(eskiR?.log || []),
          {
            saat: now,
            kullanici: ROLLER[aktifRol],
            islem: 'Randevu güncellendi',
          },
        ];
        if (
          (data.tarih || seciliTarih) === today() &&
          (aktifRol === 'sekreter' || aktifRol === 'personel')
        ) {
          const gl = {
            deg_tarih: today(),
            deg_saat: now,
            kullanic: ROLLER[aktifRol],
            hasta: data.hasta,
            oda: data.oda,
            randevu_tarih: data.tarih,
            eski_saat: eskiR?.saat,
            eski_sure: eskiR?.sure,
            yeni_saat: data.saat,
            yeni_sure: data.sure,
            bolgeler: data.bolgeler || [],
          };
          const [ins] = await sbInsert('gunici_log', gl);
          setGunIciLog((prev) => [
            {
              ...gl,
              id: ins.id,
              degTarih: gl.deg_tarih,
              degSaat: gl.deg_saat,
              kullanic: gl.kullanic,
              eskiSaat: gl.eski_saat,
              eskiSure: gl.eski_sure,
              yeniSaat: gl.yeni_saat,
              yeniSure: gl.yeni_sure,
            },
            ...prev,
          ]);
        }
        const sbData = {
          oda: data.oda,
          hasta: data.hasta,
          hasta_id: data.hastaId,
          tarih: data.tarih,
          saat: data.saat,
          sure: data.sure,
          bolgeler: data.bolgeler || [],
          durum: data.durum,
          odeme: data.odeme,
          notlar: data.notlar || '',
          log: yeniLog,
        };
        await sbUpdate('randevular', data.id, sbData);
        setRandevular((prev) =>
          prev.map((r) =>
            r.id === data.id ? { ...r, ...sbData, id: data.id } : r
          )
        );
        showToast('Randevu güncellendi.');
      } else {
        const sbData = {
          oda: data.oda,
          hasta: data.hasta,
          hasta_id: data.hastaId,
          tarih: data.tarih || seciliTarih,
          saat: data.saat,
          sure: data.sure,
          bolgeler: data.bolgeler || [],
          durum: data.durum || 'Seans',
          odeme: data.odeme,
          notlar: data.notlar || '',
          log: [
            {
              saat: now,
              kullanici: ROLLER[aktifRol],
              islem: 'Randevu oluşturuldu',
            },
          ],
        };
        const [ins] = await sbInsert('randevular', sbData);
        setRandevular((prev) => [...prev, { ...sbData, id: ins.id }]);
        showToast('Randevu oluşturuldu.');
      }
      setModal(null);
      return true;
    } catch (e) {
      showToast('Hata: ' + e.message, 'error');
      return false;
    }
  }

  async function durumGuncelle(id, durum, odeme) {
    const now = nowTime();
    const r = randevular.find((x) => x.id === id);
    const yeniLog = [
      ...(r?.log || []),
      {
        saat: now,
        kullanici: ROLLER[aktifRol],
        islem: `${durum ? 'Durum: ' + durum : ''}${
          odeme ? ' | Ödeme: ' + odeme : ''
        }`,
      },
    ];
    try {
      await sbUpdate('randevular', id, {
        ...(durum ? { durum } : {}),
        ...(odeme !== undefined ? { odeme } : {}),
        log: yeniLog,
      });
      setRandevular((prev) =>
        prev.map((x) =>
          x.id !== id
            ? x
            : {
                ...x,
                ...(durum ? { durum } : {}),
                ...(odeme !== undefined ? { odeme } : {}),
                log: yeniLog,
              }
        )
      );
      showToast('Güncellendi.');
    } catch (e) {
      showToast('Hata: ' + e.message, 'error');
    }
  }

  async function randevuSil(id) {
    const r = randevular.find((x) => x.id === id);
    try {
      if (r) {
        const sl = {
          sil_tarih: today(),
          sil_saat: nowTime(),
          kullanic: ROLLER[aktifRol],
          hasta: r.hasta,
          oda: r.oda,
          randevu_tarih: r.tarih,
          randevu_saat: r.saat,
          bolgeler: r.bolgeler || [],
          sure: r.sure,
          durum: r.durum,
          odeme: r.odeme,
        };
        const [ins] = await sbInsert('sil_log', sl);
        setSilLog((prev) => [
          {
            ...sl,
            id: ins.id,
            silTarih: sl.sil_tarih,
            silSaat: sl.sil_saat,
            kullanic: sl.kullanic,
            randevuTarih: sl.randevu_tarih,
            randevuSaat: sl.randevu_saat,
          },
          ...prev,
        ]);
      }
      await sbDelete('randevular', id);
      setRandevular((prev) => prev.filter((x) => x.id !== id));
      setModal(null);
      showToast('Randevu silindi — log kaydedildi.');
    } catch (e) {
      showToast('Hata: ' + e.message, 'error');
    }
  }

  async function blokEkle(yeniBloklar) {
    try {
      const inserted = await Promise.all(
        yeniBloklar.map((b) =>
          sbInsert('bloklar', {
            oda: b.oda,
            tarih: b.tarih,
            saat: b.saat,
            sure: b.sure,
            baslik: b.baslik,
          }).then((r) => ({ ...b, id: r[0].id }))
        )
      );
      setBloklar((prev) => [...prev, ...inserted]);
      showToast(`${inserted.length} blok eklendi.`);
    } catch (e) {
      showToast('Hata: ' + e.message, 'error');
    }
  }

  async function blokSil(id) {
    try {
      await sbDelete('bloklar', id);
      setBloklar((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      showToast('Hata: ' + e.message, 'error');
    }
  }

  async function hastaEkleDB(ad, tel) {
    try {
      const [ins] = await sbInsert('hastalar', { ad, tel });
      const yeni = { id: ins.id, ad, tel };
      setHastalar((prev) => [...prev, yeni]);
      return yeni;
    } catch (e) {
      showToast('Hata: ' + e.message, 'error');
      return null;
    }
  }

  async function beklemeyeEkle(veri) {
    try {
      const sbData = {
        ad: veri.ad,
        tel: veri.tel,
        oda: veri.oda,
        bolgeler: veri.bolgeler || [],
        tercih_tarih: veri.tercihTarih || null,
        tercih_saat: veri.tercihSaat || null,
        notlar: veri.notlar || '',
        durum: 'bekliyor',
        kayit_tarih: today(),
        kayit_saat: nowTime(),
      };
      const [ins] = await sbInsert('bekleme', sbData);
      setBekleme((prev) => [
        {
          ...sbData,
          id: ins.id,
          tercihTarih: sbData.tercih_tarih,
          tercihSaat: sbData.tercih_saat,
          kayitTarih: sbData.kayit_tarih,
          kayitSaat: sbData.kayit_saat,
        },
        ...prev,
      ]);
      showToast('Bekleme listesine eklendi.');
    } catch (e) {
      showToast('Hata: ' + e.message, 'error');
    }
  }

  async function beklemeSil(id) {
    try {
      await sbDelete('bekleme', id);
      setBekleme((prev) => prev.filter((b) => b.id !== id));
      showToast('Silindi.');
    } catch (e) {
      showToast('Hata: ' + e.message, 'error');
    }
  }

  async function beklemeyiRandevuyaCevir(b) {
    setModal({
      tip: 'yeni',
      data: {
        oda: b.oda || 'alex',
        hasta: b.ad,
        hastaId: null,
        tarih: seciliTarih,
        saat: b.tercihSaat || b.tercih_saat || '09:00',
        bolgeler: b.bolgeler || [],
      },
      beklemdeId: b.id,
    });
  }

  async function beklemeRandevuAlindi(id) {
    try {
      await sbUpdate('bekleme', id, { durum: 'randevuAlindi' });
      setBekleme((prev) =>
        prev.map((b) => (b.id === id ? { ...b, durum: 'randevuAlindi' } : b))
      );
    } catch (e) {}
  }

  function rolDegistir(yeniRol) {
    setAktifRol(yeniRol);
    setYoneticiKilit(true);
    setAktifSekme('takvim');
  }

  const beklemeSayisi = bekleme.filter((b) => b.durum === 'bekliyor').length;
  const gunIciSayisi = gunIciLog.filter(
    (g) => (g.degTarih || g.deg_tarih) === today()
  ).length;

  if (yukleniyor)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'DM Sans',system-ui,sans-serif",
          background: '#f5f4f1',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#555' }}>
            Veriler yükleniyor...
          </div>
          <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>
            Supabase bağlantısı kuruluyor
          </div>
        </div>
      </div>
    );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f4f1',
        fontFamily: "'DM Sans',system-ui,sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      <header
        style={{ background: '#1a1a2e', color: '#fff', padding: '0 1.5rem' }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 56,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: 'linear-gradient(135deg,#a78bfa,#60a5fa)',
                borderRadius: 8,
              }}
            />
            <span style={{ fontWeight: 600, fontSize: 15 }}>LazerKlinik</span>
            <span style={{ opacity: 0.3, fontSize: 13, marginLeft: 4 }}>
              Randevu Sistemi
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, opacity: 0.5 }}>Rol:</span>
            <select
              value={aktifRol}
              onChange={(e) => rolDegistir(e.target.value)}
              style={{
                background: '#2d2d4e',
                color: '#fff',
                border: '1px solid #3d3d6e',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 13,
              }}
            >
              <option value="yonetici">Yönetici</option>
              <option value="sekreter">Sekreter</option>
              <option value="personel">Uygulayıcı</option>
            </select>
          </div>
        </div>
      </header>
      <nav
        style={{
          background: '#fff',
          borderBottom: '1px solid #e8e6e0',
          padding: '0 1.5rem',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex' }}>
          {[
            ['takvim', '📅 Takvim', 0],
            ['hastalar', '👤 Hastalar', 0],
            ['bekleme', '⏳ Bekleme', beklemeSayisi],
            ['rapor', '📊 Rapor', 0],
            ...(aktifRol === 'yonetici'
              ? [['log', '📋 Log', gunIciSayisi]]
              : []),
          ].map(([k, l, badge]) => (
            <button
              key={k}
              onClick={() => {
                if ((k === 'rapor' || k === 'log') && yoneticiKilit) {
                  setSifreModal(k);
                } else setAktifSekme(k);
              }}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom:
                  aktifSekme === k
                    ? '2px solid #6366f1'
                    : '2px solid transparent',
                color: aktifSekme === k ? '#6366f1' : '#666',
                fontWeight: aktifSekme === k ? 600 : 400,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {l}
              {(k === 'rapor' || k === 'log') && yoneticiKilit && (
                <span style={{ fontSize: 11, opacity: 0.5 }}>🔒</span>
              )}
              {badge > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 20,
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
      <div
        style={{ maxWidth: 1200, margin: '0 auto', padding: '1.25rem 1.5rem' }}
      >
        {aktifSekme === 'takvim' && (
          <TakvimSekme
            seciliTarih={seciliTarih}
            setSeciliTarih={setSeciliTarih}
            alexR={alexR}
            sopR={sopR}
            gunB={gunB}
            bloklar={bloklar}
            blokEkle={blokEkle}
            blokSil={blokSil}
            randevular={randevular}
            aktifRol={aktifRol}
            onYeniRandevu={(oda, saat) =>
              setModal({ tip: 'yeni', data: { oda, saat, tarih: seciliTarih } })
            }
            onRandevuTikla={(r) => setModal({ tip: 'detay', data: r })}
            showToast={showToast}
          />
        )}
        {aktifSekme === 'hastalar' && (
          <HastalarSekme
            hastalar={hastalar}
            hastaEkleDB={hastaEkleDB}
            aktifRol={aktifRol}
            showToast={showToast}
          />
        )}
        {aktifSekme === 'bekleme' && (
          <BeklemeListesi
            bekleme={bekleme}
            aktifRol={aktifRol}
            showToast={showToast}
            onRandevuyaCevir={beklemeyiRandevuyaCevir}
            onSil={beklemeSil}
            onEkle={beklemeyeEkle}
          />
        )}
        {aktifSekme === 'rapor' && (
          <RaporSekme seciliTarih={seciliTarih} randevular={randevular} />
        )}
        {aktifSekme === 'log' && aktifRol === 'yonetici' && (
          <LogSekme
            randevular={randevular}
            silLog={silLog}
            gunIciLog={gunIciLog}
          />
        )}
      </div>
      {modal && (
        <ModalWrapper onClose={() => setModal(null)}>
          {modal.tip === 'yeni' && (
            <RandevuForm
              basData={modal.data}
              hastalar={hastalar}
              hastaEkleDB={hastaEkleDB}
              aktifRol={aktifRol}
              onKaydet={async (data) => {
                const ok = await randevuKaydet(data);
                if (ok && modal.beklemdeId)
                  await beklemeRandevuAlindi(modal.beklemdeId);
              }}
              onIptal={() => setModal(null)}
            />
          )}
          {modal.tip === 'detay' && (
            <RandevuDetay
              randevu={modal.data}
              aktifRol={aktifRol}
              onDuzenle={() => setModal({ tip: 'duzenle', data: modal.data })}
              onDurumGuncelle={durumGuncelle}
              onKapat={() => setModal(null)}
              onSil={randevuSil}
            />
          )}
          {modal.tip === 'duzenle' && (
            <RandevuForm
              basData={modal.data}
              hastalar={hastalar}
              hastaEkleDB={hastaEkleDB}
              aktifRol={aktifRol}
              onKaydet={randevuKaydet}
              onIptal={() => setModal(null)}
              duzenleme
            />
          )}
        </ModalWrapper>
      )}
      {sifreModal && (
        <SifreModal
          hedef={sifreModal}
          onBasari={() => {
            setYoneticiKilit(false);
            setAktifSekme(sifreModal);
            setSifreModal(null);
          }}
          onKapat={() => setSifreModal(null)}
        />
      )}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: toast.type === 'error' ? '#dc2626' : '#16a34a',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            zIndex: 9999,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            maxWidth: 340,
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── TAKVİM ────────────────────────────────────────────────────────────────────
function TakvimSekme({
  seciliTarih,
  setSeciliTarih,
  alexR,
  sopR,
  gunB,
  bloklar,
  blokEkle,
  blokSil,
  randevular,
  aktifRol,
  onYeniRandevu,
  onRandevuTikla,
  showToast,
}) {
  const [bosPanel, setBosPanel] = useState(false);
  const [blokPanel, setBlokPanel] = useState(false);
  function prevDay() {
    setSeciliTarih(addDays(seciliTarih, -1));
  }
  function nextDay() {
    setSeciliTarih(addDays(seciliTarih, 1));
  }
  const PX = 1,
    LABEL_W = 52,
    START = 9 * 60,
    END = 20 * 60,
    TOTAL = END - START,
    totalH = TOTAL * PX;

  function randevuStyle(r) {
    const top = (timeToMin(r.saat) - START) * PX,
      height = Math.max(r.sure * PX - 2, 18);
    const renk = islemRenk(r.bolgeler, r.oda, r.durum);
    return {
      position: 'absolute',
      top,
      left: 2,
      right: 2,
      height,
      background: renk.bg,
      border: `1px solid ${renk.brd}`,
      borderRadius: 6,
      padding: '3px 7px',
      cursor: 'pointer',
      overflow: 'hidden',
      zIndex: 2,
    };
  }
  function blokStyle(b) {
    const top = (timeToMin(b.saat) - START) * PX,
      height = Math.max(b.sure * PX - 2, 18);
    return {
      position: 'absolute',
      top,
      left: 2,
      right: 2,
      height,
      background:
        'repeating-linear-gradient(45deg,#888,#888 4px,#aaa 4px,#aaa 8px)',
      border: '1px solid #666',
      borderRadius: 6,
      padding: '3px 7px',
      cursor: 'pointer',
      overflow: 'hidden',
      zIndex: 2,
      opacity: 0.85,
    };
  }
  function renderOda(randevular, bloklar, odaId) {
    return (
      <div style={{ flex: 1, position: 'relative' }}>
        {Array.from({ length: TOTAL / 15 }, (_, i) => {
          const min = START + i * 15;
          const isHour = min % 60 === 0;
          const isHalf = min % 60 === 30;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: i * 15,
                left: 0,
                right: 0,
                height: 15,
                borderTop: isHour
                  ? '1px solid #c8c8c0'
                  : isHalf
                  ? '1px dashed #ddddd8'
                  : '1px solid #efefec',
                background: isHour ? '#f8f8f6' : 'transparent',
                boxSizing: 'border-box',
              }}
            />
          );
        })}
        {Array.from({ length: TOTAL / 15 }, (_, i) => {
          const t = minToTime(START + i * 15);
          return (
            <div
              key={'c' + i}
              onClick={() => onYeniRandevu(odaId, t)}
              title={`${t} — yeni randevu`}
              style={{
                position: 'absolute',
                top: i * 15,
                left: 0,
                right: 0,
                height: 15,
                zIndex: 1,
                cursor: 'pointer',
              }}
            />
          );
        })}
        {bloklar.map((b) => (
          <div
            key={'b' + b.id}
            style={blokStyle(b)}
            onClick={() => {
              if (window.confirm(`"${b.baslik}" bloğunu sil?`)) blokSil(b.id);
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              🔒 {b.baslik}
            </div>
          </div>
        ))}
        {randevular.map((r) => (
          <div
            key={r.id}
            style={randevuStyle(r)}
            onClick={(e) => {
              e.stopPropagation();
              onRandevuTikla(r);
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {r.hasta}
            </div>
            {r.sure >= 25 && r.bolgeler?.length > 0 && (
              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.85)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {r.bolgeler.slice(0, 3).join(' · ')}
                {r.bolgeler.length > 3 ? ` +${r.bolgeler.length - 3}` : ''}
              </div>
            )}
            {r.sure >= 20 && (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                {r.saat} · {r.sure}dk{r.odeme ? ` · ${r.odeme}` : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevDay} style={navBtnStyle}>
            ←
          </button>
          <button onClick={nextDay} style={navBtnStyle}>
            →
          </button>
          <button
            onClick={() => setSeciliTarih(today())}
            style={{
              ...navBtnStyle,
              color: seciliTarih === today() ? '#6366f1' : '#444',
              fontWeight: seciliTarih === today() ? 600 : 400,
            }}
          >
            Bugün
          </button>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {formatDate(seciliTarih)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="date"
            value={seciliTarih}
            onChange={(e) => setSeciliTarih(e.target.value)}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => {
              setBosPanel((p) => !p);
              setBlokPanel(false);
            }}
            style={{
              ...navBtnStyle,
              background: bosPanel ? '#eef0ff' : '#f0f0ed',
              color: bosPanel ? '#4338ca' : '#444',
              border: bosPanel ? '1px solid #a5b4fc' : '1px solid #ddd',
            }}
          >
            🔍 Boş Randevu Bul
          </button>
          {(aktifRol === 'yonetici' || aktifRol === 'sekreter') && (
            <button
              onClick={() => {
                setBlokPanel((p) => !p);
                setBosPanel(false);
              }}
              style={{
                ...navBtnStyle,
                background: blokPanel ? '#fee2e2' : '#f0f0ed',
                color: blokPanel ? '#dc2626' : '#444',
                border: blokPanel ? '1px solid #fca5a5' : '1px solid #ddd',
              }}
            >
              🔒 Blok Kapat
            </button>
          )}
        </div>
      </div>
      {bosPanel && (
        <BosRandevuPanel
          randevular={randevular}
          bloklar={bloklar}
          setSeciliTarih={setSeciliTarih}
          onYeniRandevu={onYeniRandevu}
          onKapat={() => setBosPanel(false)}
        />
      )}
      {blokPanel && (
        <BlokPanel
          bloklar={bloklar}
          blokEkle={blokEkle}
          blokSil={blokSil}
          seciliTarih={seciliTarih}
          showToast={showToast}
          onKapat={() => setBlokPanel(false)}
        />
      )}
      <div
        style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}
      >
        {Object.entries(RENK)
          .filter(([k]) => k !== 'blok' && k !== 'gelmedi')
          .map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: '#666',
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: v.bg,
                  flexShrink: 0,
                }}
              />
              {v.label}
            </div>
          ))}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: '#666',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background:
                'repeating-linear-gradient(45deg,#888,#888 2px,#aaa 2px,#aaa 4px)',
              flexShrink: 0,
            }}
          />
          Blok
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[
          { l: 'Alex', v: alexR.length, c: '#2d6a35' },
          { l: 'Soprano', v: sopR.length, c: '#5b3fa0' },
          {
            l: 'Gelmedi',
            v: [...alexR, ...sopR].filter((r) => r.durum === 'Gelmedi').length,
            c: '#b45309',
          },
          { l: 'Toplam', v: alexR.length + sopR.length, c: '#555' },
        ].map((s) => (
          <div
            key={s.l}
            style={{
              flex: 1,
              background: '#fff',
              border: '1px solid #e8e6e0',
              borderRadius: 10,
              padding: '8px 12px',
            }}
          >
            <div style={{ fontSize: 11, color: '#888' }}>{s.l}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: s.c }}>
              {s.v}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e8e6e0',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            borderBottom: '2px solid #e8e6e0',
            background: '#f7f7f5',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: LABEL_W,
              flexShrink: 0,
              padding: '10px 6px',
              fontSize: 11,
              color: '#aaa',
              textAlign: 'right',
              paddingRight: 8,
            }}
          >
            Saat
          </div>
          {[
            ['🟢 Alex Lazer', '#2d6a35'],
            ['🟣 Soprano / Cilt / Forma', '#5b3fa0'],
          ].map(([l, c]) => (
            <div
              key={l}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderLeft: '1px solid #e8e6e0',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: c }}>
                {l}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', overflowY: 'auto', maxHeight: '72vh' }}>
          <div
            style={{
              width: LABEL_W,
              flexShrink: 0,
              position: 'relative',
              height: totalH,
            }}
          >
            {Array.from({ length: TOTAL / 60 }, (_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: i * 60 - 7,
                  width: '100%',
                  textAlign: 'right',
                  paddingRight: 6,
                  fontSize: 10,
                  color: '#bbb',
                  fontWeight: 500,
                  userSelect: 'none',
                }}
              >
                {minToTime(START + i * 60)}
              </div>
            ))}
          </div>
          <div
            style={{
              flex: 1,
              borderLeft: '1px solid #e8e6e0',
              position: 'relative',
              height: totalH,
            }}
          >
            {renderOda(
              alexR,
              gunB.filter((b) => b.oda === 'alex'),
              'alex'
            )}
          </div>
          <div
            style={{
              flex: 1,
              borderLeft: '1px solid #e8e6e0',
              position: 'relative',
              height: totalH,
            }}
          >
            {renderOda(
              sopR,
              gunB.filter((b) => b.oda === 'soprano'),
              'soprano'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
const navBtnStyle = {
  background: '#f0f0ed',
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: 'inherit',
};

// ── BOŞ RANDEVU BUL ───────────────────────────────────────────────────────────
function BosRandevuPanel({
  randevular,
  bloklar,
  setSeciliTarih,
  onYeniRandevu,
  onKapat,
}) {
  const [oda, setOda] = useState('alex');
  const [bolgeler, setBolgeler] = useState([]);
  const [sure, setSure] = useState(30);
  const [gunFiltre, setGunFiltre] = useState('hepsi');
  const [saatFiltre, setSaatFiltre] = useState('hepsi');
  const [aralikGun, setAralikGun] = useState(14);
  const [sonuclar, setSonuclar] = useState(null);
  const bolgeListesi = oda === 'alex' ? ALEX_BOLGELER : SOPRANO_BOLGELER;
  function toggleBolge(b) {
    const yeni = bolgeler.includes(b)
      ? bolgeler.filter((x) => x !== b)
      : [...bolgeler, b];
    setBolgeler(yeni);
    const t = yeni.reduce((s, x) => s + (BOLGE_SURELER[x] || 15), 0);
    if (t > 0) setSure(t);
  }
  function bul() {
    const sonuc = [];
    for (let i = 0; i < aralikGun; i++) {
      const tarih = addDays(today(), i);
      const dow = dayOfWeek(tarih);
      if (gunFiltre === 'haftaici' && (dow === 0 || dow === 6)) continue;
      if (gunFiltre === 'haftasonu' && dow !== 0 && dow !== 6) continue;
      const S = 9 * 60,
        E = 20 * 60;
      for (let t = S; t + sure <= E; t += 15) {
        const saat = minToTime(t);
        const bitis = t + sure;
        if (saatFiltre === 'sabah' && t >= 13 * 60) continue;
        if (saatFiltre === 'ogle_sonrasi' && (t < 13 * 60 || t >= 17 * 60))
          continue;
        if (saatFiltre === '17_sonrasi' && t < 17 * 60) continue;
        const rc = randevular
          .filter((r) => r.oda === oda && r.tarih === tarih)
          .some((r) => {
            const b = timeToMin(r.saat),
              e = b + r.sure;
            return t < e && bitis > b;
          });
        const bc = bloklar
          .filter((b) => b.oda === oda && b.tarih === tarih)
          .some((b) => {
            const bb = timeToMin(b.saat),
              be = bb + b.sure;
            return t < be && bitis > bb;
          });
        if (!rc && !bc) {
          if (!sonuc.some((s) => s.tarih === tarih && s.saat === saat))
            sonuc.push({ tarih, saat });
          if (sonuc.filter((s) => s.tarih === tarih).length >= 3) break;
        }
      }
      if (sonuc.length >= 15) break;
    }
    setSonuclar(sonuc);
  }
  function secVeGit(s) {
    setSeciliTarih(s.tarih);
    onYeniRandevu(oda, s.saat);
    onKapat();
  }
  const gruplar = {};
  (sonuclar || []).forEach((s) => {
    if (!gruplar[s.tarih]) gruplar[s.tarih] = [];
    gruplar[s.tarih].push(s.saat);
  });
  return (
    <div
      style={{
        background: '#fff',
        border: '1.5px solid #a5b4fc',
        borderRadius: 12,
        padding: '1.25rem',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: '#4338ca' }}>
          🔍 Boş Randevu Bul
        </div>
        <button
          onClick={onKapat}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 18,
            cursor: 'pointer',
            color: '#aaa',
          }}
        >
          ✕
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <Label>Oda</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              ['alex', 'Alex'],
              ['soprano', 'Soprano'],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => {
                  setOda(k);
                  setBolgeler([]);
                }}
                style={chipStyle(oda === k)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Süre (dk)</Label>
          <input
            type="number"
            min={5}
            max={240}
            step={5}
            value={sure}
            onChange={(e) => setSure(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
      </div>
      <Label>İşlemler</Label>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}
      >
        {bolgeListesi.map((b) => (
          <button
            key={b}
            onClick={() => toggleBolge(b)}
            style={chipStyle(bolgeler.includes(b))}
          >
            {b}
          </button>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <Label>Gün</Label>
          <select
            value={gunFiltre}
            onChange={(e) => setGunFiltre(e.target.value)}
            style={inputStyle}
          >
            <option value="hepsi">Tüm günler</option>
            <option value="haftaici">Hafta içi</option>
            <option value="haftasonu">Hafta sonu</option>
          </select>
        </div>
        <div>
          <Label>Saat</Label>
          <select
            value={saatFiltre}
            onChange={(e) => setSaatFiltre(e.target.value)}
            style={inputStyle}
          >
            <option value="hepsi">Tüm saatler</option>
            <option value="sabah">Sabah (09-13)</option>
            <option value="ogle_sonrasi">Öğleden sonra</option>
            <option value="17_sonrasi">17:00 sonrası</option>
          </select>
        </div>
        <div>
          <Label>Kaç gün?</Label>
          <select
            value={aralikGun}
            onChange={(e) => setAralikGun(Number(e.target.value))}
            style={inputStyle}
          >
            <option value={7}>1 hafta</option>
            <option value={14}>2 hafta</option>
            <option value={30}>1 ay</option>
          </select>
        </div>
      </div>
      <button onClick={bul} style={{ ...btnPrimary, marginBottom: 14 }}>
        Boş Randevu Getir
      </button>
      {sonuclar !== null &&
        (Object.keys(gruplar).length === 0 ? (
          <div style={{ fontSize: 13, color: '#888' }}>
            Bu kriterlerde boş randevu bulunamadı.
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: 12,
                color: '#6366f1',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              ✅ {sonuclar.length} slot bulundu:
            </div>
            {Object.entries(gruplar).map(([tarih, saatler]) => (
              <div key={tarih} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#555',
                    marginBottom: 5,
                  }}
                >
                  {formatDateShort(tarih)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {saatler.map((s) => (
                    <button
                      key={s}
                      onClick={() => secVeGit({ tarih, saat: s })}
                      style={{
                        padding: '5px 14px',
                        background: '#eef0ff',
                        color: '#4338ca',
                        border: '1.5px solid #a5b4fc',
                        borderRadius: 20,
                        fontSize: 13,
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontFamily: 'inherit',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

// ── BLOK PANEL ────────────────────────────────────────────────────────────────
function BlokPanel({
  bloklar,
  blokEkle,
  blokSil,
  seciliTarih,
  showToast,
  onKapat,
}) {
  const [oda, setOda] = useState('alex');
  const [baslik, setBaslik] = useState('Öğle Arası');
  const [saat, setSaat] = useState('13:00');
  const [sure, setSure] = useState(60);
  const [tekrar, setTekrar] = useState('tek');
  const gunBloklar = bloklar.filter((b) => b.tarih === seciliTarih);
  function ekle() {
    if (!baslik.trim()) {
      showToast('Başlık girin', 'error');
      return;
    }
    const yeniBloklar = [];
    if (tekrar === 'tek') {
      const odalar = oda === 'ikisi' ? ['alex', 'soprano'] : [oda];
      odalar.forEach((o) =>
        yeniBloklar.push({
          oda: o,
          tarih: seciliTarih,
          saat,
          sure,
          baslik: baslik.trim(),
        })
      );
    } else {
      for (let i = 0; i < 60; i++) {
        const t = addDays(seciliTarih, i);
        const dow = dayOfWeek(t);
        if (tekrar === 'haftaici' && (dow === 0 || dow === 6)) continue;
        const odalar = oda === 'ikisi' ? ['alex', 'soprano'] : [oda];
        odalar.forEach((o) =>
          yeniBloklar.push({
            oda: o,
            tarih: t,
            saat,
            sure,
            baslik: baslik.trim(),
          })
        );
      }
    }
    blokEkle(yeniBloklar);
  }
  return (
    <div
      style={{
        background: '#fff',
        border: '1.5px solid #fca5a5',
        borderRadius: 12,
        padding: '1.25rem',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: '#dc2626' }}>
          🔒 Blok Kapat
        </div>
        <button
          onClick={onKapat}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 18,
            cursor: 'pointer',
            color: '#aaa',
          }}
        >
          ✕
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <Label>Oda</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              ['alex', 'Alex'],
              ['soprano', 'Soprano'],
              ['ikisi', 'Her ikisi'],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setOda(k)}
                style={chipStyle(oda === k)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Başlık</Label>
          <input
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div>
          <Label>Başlangıç</Label>
          <select
            value={saat}
            onChange={(e) => setSaat(e.target.value)}
            style={inputStyle}
          >
            {SAATLER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Süre (dk)</Label>
          <input
            type="number"
            min={15}
            max={480}
            step={15}
            value={sure}
            onChange={(e) => setSure(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div>
          <Label>Tekrar</Label>
          <select
            value={tekrar}
            onChange={(e) => setTekrar(e.target.value)}
            style={inputStyle}
          >
            <option value="tek">Sadece bugün</option>
            <option value="haftaici">60 gün hafta içi</option>
            <option value="hergün">60 gün her gün</option>
          </select>
        </div>
      </div>
      <button
        onClick={ekle}
        style={{ ...btnPrimary, background: '#dc2626', marginBottom: 14 }}
      >
        Bloğu Ekle
      </button>
      {gunBloklar.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#999',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Bu günün blokları
          </div>
          {gunBloklar.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 10px',
                background: '#f7f7f5',
                borderRadius: 8,
                marginBottom: 4,
                fontSize: 13,
              }}
            >
              <span>
                🔒 {b.baslik} ·{' '}
                {b.oda === 'ikisi'
                  ? 'Her ikisi'
                  : b.oda === 'alex'
                  ? 'Alex'
                  : 'Soprano'}{' '}
                · {b.saat} · {b.sure}dk
              </span>
              <button
                onClick={() => blokSil(b.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SÜRE KONTROL ──────────────────────────────────────────────────────────────
function SureKontrol({ sure, setSure }) {
  const [duz, setDuz] = useState(false);
  const [gec, setGec] = useState(String(sure));
  useEffect(() => {
    setGec(String(sure));
  }, [sure]);
  function onBlur() {
    const v = parseInt(gec);
    if (!isNaN(v) && v >= 5 && v <= 300) setSure(v);
    else setGec(String(sure));
    setDuz(false);
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        onClick={() => setSure((s) => Math.max(5, s - 5))}
        style={sureBtnStyle}
      >
        −
      </button>
      {duz ? (
        <input
          autoFocus
          value={gec}
          onChange={(e) => setGec(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onBlur();
            if (e.key === 'Escape') {
              setGec(String(sure));
              setDuz(false);
            }
          }}
          style={{
            width: 60,
            textAlign: 'center',
            padding: '5px 6px',
            border: '1.5px solid #6366f1',
            borderRadius: 7,
            fontSize: 14,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
      ) : (
        <div
          onClick={() => setDuz(true)}
          style={{
            minWidth: 60,
            textAlign: 'center',
            padding: '5px 6px',
            border: '1.5px solid #6366f1',
            borderRadius: 7,
            fontSize: 14,
            fontWeight: 600,
            color: '#4338ca',
            background: '#eef0ff',
            cursor: 'text',
            userSelect: 'none',
          }}
        >
          {sure} dk
        </div>
      )}
      <button
        onClick={() => setSure((s) => Math.min(300, s + 5))}
        style={sureBtnStyle}
      >
        +
      </button>
    </div>
  );
}
const sureBtnStyle = {
  width: 32,
  height: 32,
  border: '1px solid #ddd',
  borderRadius: 8,
  background: '#f5f5f2',
  cursor: 'pointer',
  fontSize: 18,
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#444',
};

// ── RANDEVU FORM ──────────────────────────────────────────────────────────────
function RandevuForm({
  basData,
  hastalar,
  hastaEkleDB,
  aktifRol,
  onKaydet,
  onIptal,
  duzenleme,
}) {
  const [oda, setOda] = useState(basData.oda || 'alex');
  const [hasta, setHasta] = useState(basData.hasta || '');
  const [hastaId, setHastaId] = useState(basData.hastaId || null);
  const [tarih, setTarih] = useState(basData.tarih || today());
  const [saat, setSaat] = useState(basData.saat || '09:00');
  const [seciliBolgeler, setSeciliBolgeler] = useState(basData.bolgeler || []);
  const [sure, setSure] = useState(basData.sure || 15);
  const [manuelSure, setManuelSure] = useState(!!basData.sure);
  const [durum, setDurum] = useState(basData.durum || 'Seans');
  const [odeme, setOdeme] = useState(basData.odeme || null);
  const [notlar, setNotlar] = useState(basData.notlar || '');
  const [yeniHasta, setYeniHasta] = useState(false);
  const [yeniAd, setYeniAd] = useState('');
  const [yeniTel, setYeniTel] = useState('');
  const [hastaFiltre, setHastaFiltre] = useState('');
  const [kayitYapiliyor, setKayitYapiliyor] = useState(false);
  const bolgeler = oda === 'alex' ? ALEX_BOLGELER : SOPRANO_BOLGELER;
  const durumlar = oda === 'alex' ? DURUMLAR_ALEX : DURUMLAR_SOPRANO;
  useEffect(() => {
    if (manuelSure) return;
    const t = seciliBolgeler.reduce((s, b) => s + (BOLGE_SURELER[b] || 15), 0);
    setSure(durum === 'Kontrol' ? Math.ceil((t || 15) / 2) : t || 15);
  }, [seciliBolgeler, durum, manuelSure]);
  function handleSureChange(v) {
    setSure(v);
    setManuelSure(true);
  }
  function toggleBolge(b) {
    setManuelSure(false);
    setSeciliBolgeler((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
  }
  async function hastaEkle() {
    if (!yeniAd.trim()) return;
    const yeni = await hastaEkleDB(yeniAd.trim(), yeniTel.trim());
    if (yeni) {
      setHasta(yeni.ad);
      setHastaId(yeni.id);
      setYeniHasta(false);
      setYeniAd('');
      setYeniTel('');
    }
  }
  async function submit() {
    if (!hasta) {
      alert('Hasta seçin.');
      return;
    }
    if (seciliBolgeler.length === 0) {
      alert('En az bir bölge seçin.');
      return;
    }
    setKayitYapiliyor(true);
    await onKaydet({
      id: basData.id || null,
      oda,
      hasta,
      hastaId,
      tarih,
      saat,
      sure,
      bolgeler: seciliBolgeler,
      durum,
      odeme,
      notlar,
    });
    setKayitYapiliyor(false);
  }
  const filtreliHastalar = hastalar.filter((h) =>
    h.ad.toLowerCase().includes(hastaFiltre.toLowerCase())
  );
  const otomatikSure = (() => {
    const t = seciliBolgeler.reduce((s, b) => s + (BOLGE_SURELER[b] || 15), 0);
    return durum === 'Kontrol' ? Math.ceil((t || 15) / 2) : t || 15;
  })();
  const onizlemeRenk = islemRenk(seciliBolgeler, oda, durum);
  return (
    <div>
      <h2 style={modalTitleStyle}>
        {duzenleme ? 'Randevu Düzenle' : 'Yeni Randevu'}
      </h2>
      <Label>Oda</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          ['alex', '🟢 Alex Lazer'],
          ['soprano', '🟣 Soprano / Cilt / Forma'],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => {
              setOda(k);
              setSeciliBolgeler([]);
              setManuelSure(false);
            }}
            style={chipStyle(oda === k)}
          >
            {l}
          </button>
        ))}
      </div>
      <Label>Hasta</Label>
      {!yeniHasta ? (
        <div style={{ marginBottom: 14 }}>
          <input
            value={hastaFiltre}
            onChange={(e) => setHastaFiltre(e.target.value)}
            placeholder="Hasta ara..."
            style={inputStyle}
          />
          <div
            style={{
              maxHeight: 130,
              overflowY: 'auto',
              border: '1px solid #e0e0da',
              borderRadius: 8,
              marginTop: 4,
            }}
          >
            {filtreliHastalar.map((h) => (
              <div
                key={h.id}
                onClick={() => {
                  setHasta(h.ad);
                  setHastaId(h.id);
                  setHastaFiltre('');
                }}
                style={{
                  padding: '7px 12px',
                  cursor: 'pointer',
                  background: hastaId === h.id ? '#eef0ff' : 'transparent',
                  borderBottom: '1px solid #f0f0ec',
                  fontSize: 14,
                }}
              >
                <strong>{h.ad}</strong>
                {h.tel && (
                  <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                    {h.tel}
                  </span>
                )}
              </div>
            ))}
          </div>
          {hasta && (
            <div style={{ fontSize: 13, color: '#6366f1', marginTop: 4 }}>
              ✓ Seçili: {hasta}
            </div>
          )}
          <button
            onClick={() => setYeniHasta(true)}
            style={{ ...chipStyle(false), marginTop: 6, fontSize: 12 }}
          >
            + Yeni Hasta Ekle
          </button>
        </div>
      ) : (
        <div
          style={{
            background: '#f7f7f5',
            borderRadius: 10,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <input
            value={yeniAd}
            onChange={(e) => setYeniAd(e.target.value)}
            placeholder="Ad Soyad *"
            style={{ ...inputStyle, marginBottom: 6 }}
          />
          <input
            value={yeniTel}
            onChange={(e) => setYeniTel(e.target.value)}
            placeholder="Telefon"
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={hastaEkle} style={btnPrimary}>
              Kaydet
            </button>
            <button onClick={() => setYeniHasta(false)} style={btnSecondary}>
              İptal
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div>
          <Label>Tarih</Label>
          <input
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <Label>Saat</Label>
          <select
            value={saat}
            onChange={(e) => setSaat(e.target.value)}
            style={inputStyle}
          >
            {SAATLER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Label>Bölgeler</Label>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}
      >
        {bolgeler.map((b) => (
          <button
            key={b}
            onClick={() => toggleBolge(b)}
            style={chipStyle(seciliBolgeler.includes(b))}
          >
            {b}
          </button>
        ))}
      </div>
      {seciliBolgeler.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: onizlemeRenk.bg,
            }}
          />
          <span style={{ fontSize: 12, color: '#666' }}>
            {onizlemeRenk.label}
          </span>
        </div>
      )}
      <div
        style={{
          background: '#f7f7f5',
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div>
            <Label>Süre</Label>
            {manuelSure && seciliBolgeler.length > 0 && (
              <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>
                ✎ Manuel · otomatik: {otomatikSure}dk{' '}
                <button
                  onClick={() => {
                    setManuelSure(false);
                    setSure(otomatikSure);
                  }}
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    color: '#6366f1',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Sıfırla
                </button>
              </div>
            )}
          </div>
          <SureKontrol sure={sure} setSure={handleSureChange} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <Label>Durum</Label>
        <select
          value={durum}
          onChange={(e) => {
            setDurum(e.target.value);
            setManuelSure(false);
          }}
          style={inputStyle}
        >
          {durumlar.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <Label>Ödeme</Label>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}
      >
        {ODEME_TIPLERI.map((o) => (
          <button
            key={o}
            onClick={() => setOdeme(odeme === o ? null : o)}
            style={chipStyle(odeme === o)}
          >
            {o}
          </button>
        ))}
      </div>
      <Label>Notlar</Label>
      <textarea
        value={notlar}
        onChange={(e) => setNotlar(e.target.value)}
        rows={2}
        placeholder="Opsiyonel..."
        style={{ ...inputStyle, resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          onClick={submit}
          disabled={kayitYapiliyor}
          style={{ ...btnPrimary, opacity: kayitYapiliyor ? 0.7 : 1 }}
        >
          {kayitYapiliyor
            ? 'Kaydediliyor...'
            : duzenleme
            ? 'Güncelle'
            : 'Randevu Oluştur'}
        </button>
        <button onClick={onIptal} style={btnSecondary}>
          İptal
        </button>
      </div>
    </div>
  );
}

// ── RANDEVU DETAY ─────────────────────────────────────────────────────────────
function RandevuDetay({
  randevu: r,
  aktifRol,
  onDuzenle,
  onDurumGuncelle,
  onKapat,
  onSil,
}) {
  const [durum, setDurum] = useState(r.durum);
  const [odeme, setOdeme] = useState(r.odeme);
  const durumlar = r.oda === 'alex' ? DURUMLAR_ALEX : DURUMLAR_SOPRANO;
  const renk = islemRenk(r.bolgeler, r.oda, r.durum);
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            {r.hasta}
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: renk.bg,
              }}
            />
            <span style={{ fontSize: 12, color: '#888' }}>
              {r.oda === 'alex' ? 'Alex Lazer' : 'Soprano / Cilt / Forma'}
            </span>
          </div>
        </div>
        <span
          style={{
            background: renk.bg,
            color: '#fff',
            fontSize: 12,
            padding: '3px 10px',
            borderRadius: 20,
            flexShrink: 0,
          }}
        >
          {r.tarih} · {r.saat}
        </span>
      </div>
      <div
        style={{
          background: '#f7f7f5',
          borderRadius: 10,
          padding: 12,
          marginBottom: 14,
        }}
      >
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}
        >
          {(r.bolgeler || []).map((b) => (
            <span
              key={b}
              style={{
                background: '#e8e6ff',
                color: '#5b5bd6',
                fontSize: 13,
                padding: '2px 10px',
                borderRadius: 20,
              }}
            >
              {b}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
          Süre: <strong>{r.sure} dk</strong>
        </div>
        {r.notlar && (
          <div
            style={{
              fontSize: 13,
              color: '#555',
              marginTop: 6,
              fontStyle: 'italic',
            }}
          >
            "{r.notlar}"
          </div>
        )}
      </div>
      <Label>Durum</Label>
      <div
        style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}
      >
        {durumlar.map((d) => (
          <button
            key={d}
            onClick={() => setDurum(d)}
            style={chipStyle(durum === d)}
          >
            {d}
          </button>
        ))}
      </div>
      <Label>Ödeme</Label>
      <div
        style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}
      >
        {ODEME_TIPLERI.map((o) => (
          <button
            key={o}
            onClick={() => setOdeme(odeme === o ? null : o)}
            style={chipStyle(odeme === o)}
          >
            {o}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            onDurumGuncelle(r.id, durum, odeme);
            onKapat();
          }}
          style={btnPrimary}
        >
          Kaydet
        </button>
        {(aktifRol === 'sekreter' || aktifRol === 'yonetici') && (
          <button onClick={onDuzenle} style={btnSecondary}>
            Düzenle
          </button>
        )}
        <button
          onClick={() => {
            if (window.confirm('Bu randevu silinecek. Emin misiniz?'))
              onSil(r.id);
          }}
          style={{ ...btnSecondary, color: '#dc2626', borderColor: '#dc2626' }}
        >
          Sil
        </button>
        <button onClick={onKapat} style={btnSecondary}>
          Kapat
        </button>
      </div>
      {(r.log || []).length > 0 && (
        <div
          style={{
            marginTop: 16,
            borderTop: '1px solid #e8e6e0',
            paddingTop: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#999',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            İşlem Geçmişi
          </div>
          {(r.log || []).map((l, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                fontSize: 12,
                color: '#666',
                marginBottom: 4,
              }}
            >
              <span style={{ color: '#aaa', minWidth: 40 }}>{l.saat}</span>
              <span style={{ color: '#6366f1', minWidth: 60 }}>
                {l.kullanici}
              </span>
              <span>{l.islem}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── BEKLEME ───────────────────────────────────────────────────────────────────
function BeklemeListesi({
  bekleme,
  aktifRol,
  showToast,
  onRandevuyaCevir,
  onSil,
  onEkle,
}) {
  const [formAcik, setFormAcik] = useState(false);
  const [ad, setAd] = useState('');
  const [tel, setTel] = useState('');
  const [oda, setOda] = useState('alex');
  const [bolgeler, setBolgeler] = useState([]);
  const [tercihTarih, setTercihTarih] = useState('');
  const [tercihSaat, setTercihSaat] = useState('');
  const [notlar, setNotlar] = useState('');
  const bolgeListesi = oda === 'alex' ? ALEX_BOLGELER : SOPRANO_BOLGELER;
  function toggleBolge(b) {
    setBolgeler((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
  }
  async function kaydet() {
    if (!ad.trim() || !tel.trim()) {
      showToast('Ad ve telefon zorunlu!', 'error');
      return;
    }
    await onEkle({
      ad: ad.trim(),
      tel: tel.trim(),
      oda,
      bolgeler,
      tercihTarih,
      tercihSaat,
      notlar,
    });
    setAd('');
    setTel('');
    setOda('alex');
    setBolgeler([]);
    setTercihTarih('');
    setTercihSaat('');
    setNotlar('');
    setFormAcik(false);
  }
  const bekleyenler = bekleme.filter((b) => b.durum === 'bekliyor');
  const alinanlar = bekleme.filter((b) => b.durum === 'randevuAlindi');
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            Bekleme Listesi
          </h2>
          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>
            Boşluk çıktığında aramak için hasta bilgilerini kaydedin
          </p>
        </div>
        {aktifRol !== 'personel' && (
          <button
            onClick={() => setFormAcik(!formAcik)}
            style={{
              ...btnPrimary,
              background: formAcik ? '#6b7280' : '#6366f1',
            }}
          >
            {formAcik ? 'İptal' : '+ Listeye Ekle'}
          </button>
        )}
      </div>
      {formAcik && (
        <div
          style={{
            background: '#fff',
            border: '1.5px solid #a5b4fc',
            borderRadius: 12,
            padding: '1.25rem',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#4338ca',
              marginBottom: 14,
            }}
          >
            📋 Yeni Bekleme Kaydı
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div>
              <Label>Ad Soyad *</Label>
              <input
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                placeholder="Hasta adı"
                style={inputStyle}
              />
            </div>
            <div>
              <Label>Telefon *</Label>
              <input
                value={tel}
                onChange={(e) => setTel(e.target.value)}
                placeholder="0532 ..."
                style={inputStyle}
              />
            </div>
          </div>
          <Label>Oda</Label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              ['alex', 'Alex Lazer'],
              ['soprano', 'Soprano / Cilt / Forma'],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => {
                  setOda(k);
                  setBolgeler([]);
                }}
                style={chipStyle(oda === k)}
              >
                {l}
              </button>
            ))}
          </div>
          <Label>İstenen İşlemler</Label>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 12,
            }}
          >
            {bolgeListesi.map((b) => (
              <button
                key={b}
                onClick={() => toggleBolge(b)}
                style={chipStyle(bolgeler.includes(b))}
              >
                {b}
              </button>
            ))}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div>
              <Label>Tercih Tarih</Label>
              <input
                type="date"
                value={tercihTarih}
                onChange={(e) => setTercihTarih(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <Label>Tercih Saat</Label>
              <select
                value={tercihSaat}
                onChange={(e) => setTercihSaat(e.target.value)}
                style={inputStyle}
              >
                <option value="">Fark etmez</option>
                {SAATLER.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Label>Not</Label>
          <textarea
            value={notlar}
            onChange={(e) => setNotlar(e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={kaydet} style={btnPrimary}>
              Listeye Ekle
            </button>
            <button onClick={() => setFormAcik(false)} style={btnSecondary}>
              İptal
            </button>
          </div>
        </div>
      )}
      {bekleyenler.length === 0 && !formAcik ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e8e6e0',
            borderRadius: 12,
            padding: '2.5rem',
            textAlign: 'center',
            color: '#aaa',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>
            Bekleme listesi boş
          </div>
        </div>
      ) : (
        <>
          {bekleyenler.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#92400e',
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginBottom: 10,
                }}
              >
                ⏳ {bekleyenler.length} kişi bekliyor
              </div>
              {bekleyenler.map((b) => (
                <BeklemeKarti
                  key={b.id}
                  b={b}
                  onRandevuyaCevir={onRandevuyaCevir}
                  onSil={onSil}
                  aktifRol={aktifRol}
                />
              ))}
            </div>
          )}
          {alinanlar.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                Randevu Alınanlar
              </div>
              {alinanlar.map((b) => (
                <BeklemeKarti
                  key={b.id}
                  b={b}
                  onRandevuyaCevir={onRandevuyaCevir}
                  onSil={onSil}
                  aktifRol={aktifRol}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
function BeklemeKarti({ b, onRandevuyaCevir, onSil, aktifRol }) {
  const alindi = b.durum === 'randevuAlindi';
  const tel = b.tel;
  const tercihTarih = b.tercihTarih || b.tercih_tarih;
  const tercihSaat = b.tercihSaat || b.tercih_saat;
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${alindi ? '#bbf7d0' : '#e8e6e0'}`,
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 8,
        opacity: alindi ? 0.75 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 15 }}>{b.ad}</span>
            <span
              style={{
                background: alindi ? '#dcfce7' : '#fef3c7',
                color: alindi ? '#166534' : '#92400e',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                fontWeight: 500,
              }}
            >
              {alindi ? '✓ Randevu Alındı' : '⏳ Bekliyor'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>
            📞{' '}
            <a
              href={`tel:${tel}`}
              style={{
                color: '#6366f1',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              {tel}
            </a>
            <span style={{ color: '#ccc', margin: '0 8px' }}>|</span>
            {b.oda === 'alex' ? 'Alex Lazer' : 'Soprano/Cilt/Forma'}
          </div>
          {b.bolgeler?.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                marginBottom: 6,
              }}
            >
              {b.bolgeler.map((bl) => (
                <span
                  key={bl}
                  style={{
                    background: '#eef0ff',
                    color: '#4338ca',
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 20,
                  }}
                >
                  {bl}
                </span>
              ))}
            </div>
          )}
          <div
            style={{
              fontSize: 12,
              color: '#aaa',
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {tercihTarih && (
              <span>
                📅 {tercihTarih}
                {tercihSaat ? ' ' + tercihSaat : ''}
              </span>
            )}
            {b.notlar && <span>💬 {b.notlar}</span>}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            flexShrink: 0,
          }}
        >
          {!alindi && aktifRol !== 'personel' && (
            <button
              onClick={() => onRandevuyaCevir(b)}
              style={{
                ...btnPrimary,
                fontSize: 12,
                padding: '7px 12px',
                whiteSpace: 'nowrap',
              }}
            >
              📅 Randevuya Çevir
            </button>
          )}
          {aktifRol !== 'personel' && (
            <button
              onClick={() => onSil(b.id)}
              style={{
                ...btnSecondary,
                fontSize: 12,
                padding: '6px 12px',
                color: '#dc2626',
                borderColor: '#fca5a5',
              }}
            >
              Sil
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── HASTALAR ──────────────────────────────────────────────────────────────────
function HastalarSekme({ hastalar, hastaEkleDB, aktifRol, showToast }) {
  const [filtre, setFiltre] = useState('');
  const [form, setForm] = useState(null);
  const [ad, setAd] = useState('');
  const [tel, setTel] = useState('');
  const filtreliHastalar = hastalar.filter(
    (h) =>
      h.ad.toLowerCase().includes(filtre.toLowerCase()) ||
      h.tel?.includes(filtre)
  );
  async function kaydet() {
    if (!ad.trim()) return;
    await hastaEkleDB(ad.trim(), tel.trim());
    showToast('Hasta eklendi.');
    setForm(null);
    setAd('');
    setTel('');
  }
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>
          Hasta Listesi ({hastalar.length})
        </h2>
        {(aktifRol === 'sekreter' || aktifRol === 'yonetici') && (
          <button
            onClick={() => {
              setForm('yeni');
              setAd('');
              setTel('');
            }}
            style={btnPrimary}
          >
            + Yeni Hasta
          </button>
        )}
      </div>
      <input
        value={filtre}
        onChange={(e) => setFiltre(e.target.value)}
        placeholder="İsim veya telefon ile ara..."
        style={{ ...inputStyle, marginBottom: 12 }}
      />
      {form === 'yeni' && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e0ddd5',
            borderRadius: 10,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <input
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            placeholder="Ad Soyad *"
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <input
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            placeholder="Telefon"
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={kaydet} style={btnPrimary}>
              Kaydet
            </button>
            <button onClick={() => setForm(null)} style={btnSecondary}>
              İptal
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e8e6e0',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {filtreliHastalar.length === 0 && (
          <div style={{ padding: 20, color: '#aaa', textAlign: 'center' }}>
            Hasta bulunamadı.
          </div>
        )}
        {filtreliHastalar.map((h, i) => (
          <div
            key={h.id}
            style={{
              padding: '12px 16px',
              borderBottom:
                i < filtreliHastalar.length - 1 ? '1px solid #f0f0ec' : 'none',
            }}
          >
            <div style={{ fontWeight: 500, fontSize: 14 }}>{h.ad}</div>
            {h.tel && (
              <div style={{ fontSize: 12, color: '#999' }}>{h.tel}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── RAPOR ─────────────────────────────────────────────────────────────────────
function RaporSekme({ seciliTarih, randevular }) {
  const g = randevular.filter((r) => r.tarih === seciliTarih);
  const al = g.filter((r) => r.oda === 'alex');
  const so = g.filter((r) => r.oda === 'soprano');
  function s(list) {
    return {
      seans: list.filter((r) => r.durum === 'Seans').length,
      kontrol: list.filter((r) => r.durum === 'Kontrol').length,
      gelmedi: list.filter((r) => r.durum === 'Gelmedi').length,
      nakit: list.filter((r) => r.odeme === 'Nakit').length,
      kart: list.filter((r) => r.odeme === 'Kart').length,
      eft: list.filter((r) => r.odeme === 'EFT').length,
      alinmadi: list.filter((r) => r.odeme === 'Ödeme Alınmadı').length,
      belirsiz: list.filter((r) => !r.odeme && r.durum !== 'Gelmedi').length,
    };
  }
  const a = s(al),
    so2 = s(so);
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Gün Sonu Raporu — {formatDate(seciliTarih)}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          ['🟢 Alex Lazer', a, '#2d6a35'],
          ['🟣 Soprano / Cilt / Forma', so2, '#5b3fa0'],
        ].map(([title, d, c]) => (
          <div
            key={title}
            style={{
              background: '#fff',
              border: '1px solid #e8e6e0',
              borderRadius: 12,
              padding: '1.25rem',
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: c,
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: '1px solid #f0f0ec',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#666',
                marginBottom: 8,
              }}
            >
              Durum
            </div>
            {[
              ['Seans', 'seans', '#2d6a35'],
              ['Kontrol', 'kontrol', '#b45309'],
              ['Gelmedi', 'gelmedi', '#dc2626'],
            ].map(([l, k, cl]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 14, color: '#555' }}>{l}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: cl }}>
                  {d[k]}
                </span>
              </div>
            ))}
            <div
              style={{
                borderTop: '1px solid #f0f0ec',
                marginTop: 10,
                paddingTop: 10,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#666',
                  marginBottom: 8,
                }}
              >
                Ödeme
              </div>
              {[
                ['Nakit', 'nakit'],
                ['Kart', 'kart'],
                ['EFT', 'eft'],
                ['Alınmadı', 'alinmadi'],
                ['Belirsiz', 'belirsiz'],
              ].map(([l, k]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 5,
                  }}
                >
                  <span style={{ fontSize: 13, color: '#666' }}>{l}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: d[k] > 0 ? 600 : 400,
                      color: d[k] > 0 ? '#333' : '#bbb',
                    }}
                  >
                    {d[k]}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                background: '#f7f7f5',
                borderRadius: 8,
                padding: '10px 12px',
                marginTop: 10,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, color: '#777' }}>Toplam</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: c }}>
                {d.seans + d.kontrol + d.gelmedi}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: 10,
          padding: 14,
          marginTop: 14,
          fontSize: 13,
          color: '#78350f',
        }}
      >
        <strong>⚡ Çapraz Kontrol:</strong> Bugün toplam{' '}
        <strong>
          {al.filter((r) => r.durum !== 'Gelmedi').length +
            so.filter((r) => r.durum !== 'Gelmedi').length}
        </strong>{' '}
        işlem yapıldı.
      </div>
    </div>
  );
}

// ── LOG ───────────────────────────────────────────────────────────────────────
function LogSekme({ randevular, silLog, gunIciLog }) {
  const [aktifTab, setAktifTab] = useState('gunici');
  const tumLog = randevular
    .flatMap((r) =>
      (r.log || []).map((l) => ({ ...l, hasta: r.hasta, tarih: r.tarih }))
    )
    .sort((a, b) => b.saat?.localeCompare(a.saat || '') || 0);
  const bugunGunIci = gunIciLog.filter(
    (g) => (g.degTarih || g.deg_tarih) === today()
  );
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 14 }}>
        Yönetici Logu
      </h2>
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: '#f0f0ed',
          padding: 4,
          borderRadius: 10,
          marginBottom: 16,
          width: 'fit-content',
        }}
      >
        {[
          ['gunici', '⚠️ Gün İçi', bugunGunIci.length],
          ['islem', '📋 İşlem Logu', 0],
          ['silme', '🗑️ Silme Logu', silLog.length],
        ].map(([k, l, badge]) => (
          <button
            key={k}
            onClick={() => setAktifTab(k)}
            style={{
              padding: '7px 14px',
              border: 'none',
              borderRadius: 8,
              background: aktifTab === k ? '#fff' : 'transparent',
              color: aktifTab === k ? '#333' : '#888',
              fontWeight: aktifTab === k ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: aktifTab === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {l}
            {badge > 0 && (
              <span
                style={{
                  background: k === 'gunici' ? '#f59e0b' : '#ef4444',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 20,
                  marginLeft: 5,
                }}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>
      {aktifTab === 'gunici' &&
        (bugunGunIci.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e8e6e0',
              borderRadius: 12,
              padding: '2rem',
              textAlign: 'center',
              color: '#aaa',
            }}
          >
            ✅ Bugün gün içi değişiklik yok.
          </div>
        ) : (
          <>
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 12,
                fontSize: 13,
                color: '#92400e',
              }}
            >
              ⚠️ Bugün <strong>{bugunGunIci.length}</strong> randevu
              değiştirildi.
            </div>
            <div
              style={{
                background: '#fff',
                border: '1px solid #e8e6e0',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {bugunGunIci.map((g, i) => {
                const es = g.eskiSaat || g.eski_saat;
                const ys = g.yeniSaat || g.yeni_saat;
                const esu = g.eskiSure || g.eski_sure;
                const ysu = g.yeniSure || g.yeni_sure;
                return (
                  <div
                    key={g.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom:
                        i < bugunGunIci.length - 1
                          ? '1px solid #f5f5f2'
                          : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          marginBottom: 2,
                        }}
                      >
                        {g.hasta}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {g.oda === 'alex' ? 'Alex' : 'Soprano'} · Saat:{' '}
                        <b>{es}</b>→<b>{ys}</b> · Süre: <b>{esu}dk</b>→
                        <b>{ysu}dk</b>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#6366f1',
                        }}
                      >
                        {g.kullanic}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>
                        {g.degSaat || g.deg_saat}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ))}
      {aktifTab === 'islem' && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e8e6e0',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {tumLog.length === 0 && (
            <div style={{ padding: 20, color: '#aaa', textAlign: 'center' }}>
              Log yok.
            </div>
          )}
          {tumLog.map((l, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 12,
                padding: '10px 16px',
                borderBottom: '1px solid #f5f5f2',
                fontSize: 13,
              }}
            >
              <span style={{ color: '#aaa', minWidth: 40 }}>{l.saat}</span>
              <span style={{ color: '#6366f1', minWidth: 70, fontWeight: 500 }}>
                {l.kullanici}
              </span>
              <span style={{ color: '#888', minWidth: 60 }}>{l.hasta}</span>
              <span style={{ color: '#444' }}>{l.islem}</span>
              <span style={{ marginLeft: 'auto', color: '#bbb', fontSize: 11 }}>
                {l.tarih}
              </span>
            </div>
          ))}
        </div>
      )}
      {aktifTab === 'silme' &&
        (silLog.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e8e6e0',
              borderRadius: 12,
              padding: '2rem',
              textAlign: 'center',
              color: '#aaa',
            }}
          >
            🗑️ Silinmiş randevu yok.
          </div>
        ) : (
          <>
            <div
              style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 12,
                fontSize: 13,
                color: '#9a3412',
              }}
            >
              ⚠️ Toplam <strong>{silLog.length}</strong> randevu silinmiş.
            </div>
            <div
              style={{
                background: '#fff',
                border: '1px solid #e8e6e0',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {silLog.map((s, i) => {
                const rt = s.randevuTarih || s.randevu_tarih;
                const rs = s.randevuSaat || s.randevu_saat;
                const st = s.silTarih || s.sil_tarih;
                const ss = s.silSaat || s.sil_saat;
                return (
                  <div
                    key={s.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom:
                        i < silLog.length - 1 ? '1px solid #f5f5f2' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: '#dc2626',
                          }}
                        >
                          {s.hasta}
                        </span>
                        <span
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            fontSize: 11,
                            padding: '1px 7px',
                            borderRadius: 20,
                          }}
                        >
                          Silindi
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {s.oda === 'alex' ? 'Alex' : 'Soprano'} · {rt} {rs} ·{' '}
                        {s.sure}dk{s.durum ? ' · ' + s.durum : ''}
                        {s.odeme ? ' · ' + s.odeme : ''}
                      </div>
                      {s.bolgeler?.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 4,
                            flexWrap: 'wrap',
                            marginTop: 4,
                          }}
                        >
                          {s.bolgeler.map((b) => (
                            <span
                              key={b}
                              style={{
                                background: '#f3f4f6',
                                color: '#6b7280',
                                fontSize: 11,
                                padding: '1px 7px',
                                borderRadius: 20,
                              }}
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#6366f1',
                        }}
                      >
                        {s.kullanic}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>
                        {st} {ss}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ))}
    </div>
  );
}

// ── ŞİFRE MODAL ──────────────────────────────────────────────────────────────
function SifreModal({ hedef, onBasari, onKapat }) {
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState(false);
  const [deneme, setDeneme] = useState(0);
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') onKapat();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);
  function kontrol() {
    if (sifre === 'SUM26') {
      setHata(false);
      onBasari();
    } else {
      setHata(true);
      setDeneme((d) => d + 1);
      setSifre('');
    }
  }
  return (
    <div
      onClick={onKapat}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '2rem',
          width: '100%',
          maxWidth: 360,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#1a1a2e' }}>
            Yönetici Girişi
          </div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {hedef === 'rapor' ? '📊 Rapor' : '📋 Log'} bölümüne erişmek için
            şifre gerekli
          </div>
        </div>
        <input
          autoFocus
          type="password"
          value={sifre}
          onChange={(e) => {
            setSifre(e.target.value);
            setHata(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') kontrol();
          }}
          placeholder="Şifrenizi girin"
          style={{
            ...inputStyle,
            textAlign: 'center',
            fontSize: 18,
            letterSpacing: 4,
            border: hata ? '1.5px solid #dc2626' : '1px solid #ddd',
            marginBottom: 8,
          }}
        />
        {hata && (
          <div
            style={{
              fontSize: 12,
              color: '#dc2626',
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            ❌ Yanlış şifre{deneme >= 3 ? ' — yöneticinize danışın' : ''}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={kontrol} style={{ ...btnPrimary, flex: 1 }}>
            Giriş Yap
          </button>
          <button onClick={onKapat} style={{ ...btnSecondary, flex: 1 }}>
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
function ModalWrapper({ children, onClose }) {
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '1.5rem',
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const Label = ({ children }) => (
  <div
    style={{
      fontSize: 12,
      fontWeight: 600,
      color: '#888',
      marginBottom: 5,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }}
  >
    {children}
  </div>
);
const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  color: '#333',
  background: '#fff',
  outline: 'none',
};
const chipStyle = (a) => ({
  padding: '6px 14px',
  border: a ? '1.5px solid #6366f1' : '1px solid #ddd',
  borderRadius: 20,
  background: a ? '#eef0ff' : '#fafaf8',
  color: a ? '#4338ca' : '#555',
  fontSize: 13,
  cursor: 'pointer',
  fontWeight: a ? 500 : 400,
  fontFamily: 'inherit',
});
const btnPrimary = {
  padding: '9px 18px',
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const btnSecondary = {
  padding: '9px 18px',
  background: 'transparent',
  color: '#555',
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
const modalTitleStyle = { fontSize: 19, fontWeight: 600, marginBottom: 18 };
