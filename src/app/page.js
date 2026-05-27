'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Lock, LogOut, CheckCircle, RefreshCw, Copy, FileText, 
  FolderOpen, AlertCircle, Sparkles, Youtube, Upload, Trash2, Download 
} from 'lucide-react';

export default function Home() {
  // ===== AUTH STATE =====
  const [accessToken, setAccessToken] = useState('');
  const [user, setUser] = useState(null);
  const [tokenClient, setTokenClient] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // ===== APP STATE =====
  const [currentType, setCurrentType] = useState('');
  const [currentTab, setCurrentTab] = useState('form');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [ytUrl, setYtUrl] = useState('');
  const [ytIframe, setYtIframe] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // ===== GENERATED RESULTS =====
  const [lastGeneratedText, setLastGeneratedText] = useState('');
  const [pressReleaseTitle, setPressReleaseTitle] = useState('');
  const [scores, setScores] = useState({ news: 0, dle: 0, title: 0, media: 0 });
  const [improvements, setImprovements] = useState([]);
  const [isScoring, setIsScoring] = useState(false);

  // ===== GOOGLE DRIVE STATE =====
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [savedDocUrl, setSavedDocUrl] = useState('');

  // ===== TOAST STATE =====
  const [toastMsg, setToastMsg] = useState('');
  const [showToastFlag, setShowToastFlag] = useState(false);

  // ===== FORM VALUES =====
  const [formValues, setFormValues] = useState({
    relatedIp: '', relatedCompany: '', extraNotes: '',
    kujiTitle: '', kujiDate: '', kujiPrice: '', kujiGoods: '', kujiCampaign: '',
    mediaName: '', mediaDate: '', mediaArticleTitle: '', mediaUrl: '', mediaPersons: '', mediaSummary: '',
    contentType: '', contentDate: '', contentUrl: '', contentBroadcast: '', contentDetail: '',
    spClient: '', spCollabType: '', spDate: '', spUrl: '', spSummary: '', spCopy: '',
    popupStore: '', popupConcept: '', popupPeriod: '', popupArtist: '', popupAddress: '', popupItems: '', popupEvents: '',
    pasteContent: '', relatedIpPaste: '', relatedCompanyPaste: ''
  });

  const fileInputRef = useRef(null);

  // ===== INITIALIZE GOOGLE OAUTH =====
  useEffect(() => {
    // Read saved token/profile
    const savedToken = localStorage.getItem('dle_google_token');
    const savedProfile = localStorage.getItem('dle_user_profile');
    if (savedToken && savedProfile) {
      setAccessToken(savedToken);
      setUser(JSON.parse(savedProfile));
    }
    setIsAuthLoading(false);

    // Initialize GIS Client
    const initGis = () => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.warn('Google Client ID is missing. Google Sign-In will not function.');
        return;
      }

      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (tokenResponse) => {
            if (tokenResponse.access_token) {
              const token = tokenResponse.access_token;
              setAccessToken(token);
              localStorage.setItem('dle_google_token', token);

              // Fetch User profile
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${token}` }
                });
                const profile = await res.json();
                setUser(profile);
                localStorage.setItem('dle_user_profile', JSON.stringify(profile));
                showToast('Googleアカウントでログインしました');
              } catch (e) {
                console.error('Failed to retrieve user profile:', e);
              }
            }
          },
        });
        setTokenClient(client);
      } else {
        // Retry in 100ms if GIS library hasn't finished loading
        setTimeout(initGis, 100);
      }
    };

    initGis();
  }, []);

  const handleLogin = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    } else {
      alert('Google 認証クライアントの初期化中です。しばらくお待ちください。');
    }
  };

  const handleLogout = () => {
    setAccessToken('');
    setUser(null);
    localStorage.removeItem('dle_google_token');
    localStorage.removeItem('dle_user_profile');
    showToast('ログアウトしました');
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setShowToastFlag(true);
    setTimeout(() => setShowToastFlag(false), 3000);
  };

  // ===== FORM HANDLING =====
  const handleInputChange = (field, val) => {
    setFormValues(prev => ({ ...prev, [field]: val }));
  };

  const selectType = (type) => {
    setCurrentType(type);
    setTimeout(() => {
      document.getElementById('step2-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const switchTab = (tab) => {
    setCurrentTab(tab);
  };

  // ===== FILE UPLOAD =====
  const handleFiles = (files) => {
    const newFiles = [...uploadedFiles];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!newFiles.find(f => f.name === file.name && f.size === file.size)) {
        newFiles.push(file);
      }
    }
    setUploadedFiles(newFiles);
  };

  const removeMedia = (i) => {
    const temp = [...uploadedFiles];
    temp.splice(i, 1);
    setUploadedFiles(temp);
  };

  const downloadSingleMedia = (file) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllMedia = () => {
    if (!uploadedFiles.length) return;
    uploadedFiles.forEach((file, i) => {
      setTimeout(() => downloadSingleMedia(file), i * 200);
    });
    showToast(`全 ${uploadedFiles.length} 件のダウンロードを開始しました`);
  };

  // ===== YOUTUBE IFRAME CONVERSION =====
  const generateYtIframe = () => {
    if (!ytUrl.trim()) {
      setYtIframe('URLを入力してください');
      return;
    }
    const match = ytUrl.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (!match) {
      setYtIframe('有効なYouTube URLを入力してください');
      return;
    }
    const code = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${match[1]}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    setYtIframe(code);
    navigator.clipboard.writeText(code).then(() => showToast('iframeコードをコピーしました'));
  };

  // ===== PROMPT BUILDERS (PORTED FROM ORIGINAL) =====
  const buildSystemPrompt = () => {
    return `あなたは株式会社ディー・エル・イー（DLE）の広報部専属PRライターです。
以下のDLE情報・IP情報・文体ルールを厳守し、プレスリリースを生成してください。

【DLE基本情報】
会社名：株式会社ディー・エル・イー
証券コード：3686（東証スタンダード）
代表者：代表取締役社長CEO・CCO 小野 亮
所在地：東京都千代田区麹町3-3-4 KDX麹町ビル７階
HP：https://www.dle.jp/jp/

【主要IP情報】
※YouTubeの登録者数・再生数・放送ステータスは必ずGoogle Search Groundingで最新値を確認すること。

■ 秘密結社 鷹の爪
FROGMAN原作。総統・吉田くん・レオナルド博士・菩薩峠くん・フィリップの5人組が「人と地球に優しい世界征服」を目指すコメディアニメ。島根県ご当地自虐キャラ。「島根自虐カレンダー」2011年発売以来のロングセラー。

■ そろ谷のアニメっち（クリエイター：そろ谷）
新しい笑いを求める若年層から高い評価を得るコントアニメ。監督・脚本・キャラデザをそろ谷が一人で担当。関連IP：耐え子の日常・ぽちゃーズ

■ 野原ひろし 昼メシの流儀
クレヨンしんちゃん公式スピンオフ。声優：森川智之。DLEがオルタナティブ・アニメ第1弾として制作。2025年10〜12月放送・全12話で放送終了。ニコニコ動画2025秋アニメ初速1位・初回100万再生突破。『日本アニメトレンド大賞2025』アニメ話題賞-TVアニメ部門受賞。
※放送終了作品のため「放送終了」「シーズン1放送終了」等の表記を使うこと。「放送中」は絶対に使わない。

■ 貝社員
DLEが展開するIPキャラクター。お酒・水産食品など大人向けコラボと相性が良い。

■ Fate/Grand Order 藤丸立香はわからない
TYPE-MOON原作FGOのスピンオフショートギャグアニメ。DLEがアニメーション制作担当。漫画：槌田、原作：TYPE-MOON。アニプレックス配給。Fate Project大晦日TVスペシャルにて毎年放送実績あり。DLEオンラインくじも展開済み。最新シーズン情報は検索で確認すること。

■ 小3アシベ QQゴマちゃん
原作：森下裕美（双葉社）。1988年連載開始の国民的ギャグ漫画「アシベ」シリーズ最新作。2026年4月よりテレ東系「アニもり！」毎週日曜あさ7時放送開始。DLEがオルタナティブ・アニメで制作。主題歌：Hey! Say! JUMP「CUE CUE CUTE」。現在の放送状況は検索で確認すること。

■ DLEオンラインくじ
URL：https://dle-kuji.dle.jp/
ハズレなし・購入枚数特典・ダブルチャンスが基本構成。リリース時はURL必ず記載。

【文体ルール】
■ タイトル（40字以内）
　・IP名を冒頭に出す（山カッコ『』で囲む）
　・感嘆符「！」を積極活用
　・数字・実績があれば冒頭に

■ リード文（必須フォーマット）
　「株式会社ディー・エル・イー（本社：東京都千代田区、代表取締役社長CEO・CCO 小野 亮、以下DLE）は、〜」で始める

■ 本文構成
　▼概要（日時・場所・URL等）
　▼IPについて（数字付き・最新値使用）
　▼DLEより（展望）→「DLEは〜を通じ、〜してまいります」で締める

■ 避けるべき表現
　・「放送中」→放送終了作品には使用不可。必ず検索して確認
　・「〜と思います」→「〜してまいります」に変換
　・数字なしの曖昧な実績表現だけで終わる文

【会社概要定型文（毎回末尾に必ず挿入）】
■株式会社ディー・エル・イー
会社名：株式会社ディー・エル・イー
証券コード：3686（東証スタンダード）
代表者：代表取締役社長CEO・CCO 小野 亮
所在地：東京都千代田区麹町3-3-4 KDX麹町ビル７階
創立日：2001年12月27日
HP：https://www.dle.jp/jp/

『秘密結社 鷹の爪』をはじめとするIP（著作権等の知的財産権）の企画開発やアニメ・キャラクター等のコンテンツ制作事業を軸に2014年に東証に上場。IPオーナーとして自社コンテンツの開発・活用をはじめ、ミドルクオリティのアニメーションを短納期で実現させる「オルタナティブ・アニメ」事業も展開。2025年にはAI映像スタジオ「OBETA AI STUDIO」を開設するなど、AIとIPを組み合わせた新たなコンテンツビジネスを加速させている。`;
  };

  const buildUserPrompt = (data) => {
    const typeNames = { kuji: 'オンラインくじ型', media: 'メディア掲載型', content: 'コンテンツ解禁型', sp: 'セールスプロモーション（SP）型', popup: 'POP UP STORE型' };
    const typeTitleRules = {
      kuji: 'タイトル形式：「DLEオンラインくじ×『IP名』『くじタイトル』○月○日より発売開始！」\n固定フレーズ：ハズレなし・購入枚数特典・ダブルチャンス・完全新規描き起こしイラスト・DLEオンラインくじURL（https://dle-kuji.dle.jp/）を必ず本文に記載',
      media: 'タイトル形式：「『媒体名』にて『記事タイトル』が公開されました。」\nリード文は短め。URLを本文内に必ず記載。「掲載されました」「公開されました」で締める',
      content: 'タイトル形式：「DLEがアニメーション制作を担当する『IP名』○○を解禁！」\n固定フレーズ：初解禁・オルタナティブ・アニメ・ノンクレジット（該当する場合）',
      sp: 'タイトル形式：「（キャッチコピー）！『IP名』と『クライアント名』がタイアップ！○○を公開！」\nタイトルにキャッチコピー的書き出しを入れること',
      popup: 'タイトル形式：「○月○日より開催！『店舗名』にて『IP名』POPUPSHOP〜 新規描き下ろしイラストを大公開！」'
    };

    let detailSection = '';
    if (data.mode === 'paste') {
      detailSection = `【貼り付けられた原稿・情報】\n${data.pasteContent}`;
    } else {
      const fieldLines = [];
      const fields = { ...data };
      ['type', 'mode', 'ip', 'company', 'notes'].forEach(k => delete fields[k]);
      for (const [k, v] of Object.entries(fields)) {
        if (v) fieldLines.push(`${k}：${v}`);
      }
      detailSection = `【入力された案件情報】\n${fieldLines.join('\n')}`;
    }

    return `以下の情報をもとに、DLE広報品質の日本語プレスリリースを生成してください。

【リリースの型】${typeNames[data.type] || data.type}
【関連IP】${data.ip || '（未指定）'}
${data.company ? `【関連企業】${data.company}` : ''}
${data.notes ? `【補足指示】${data.notes}` : ''}

【型固有のルール】
${typeTitleRules[data.type] || ''}

${detailSection}

【出力形式】
・タイトル（40字以内、感嘆符・IP名前出し必須）
・リード文（「株式会社ディー・エル・イー（本社：東京都千代田区、代表取締役社長CEO・CCO 小野 亮、以下DLE）は、〜」で始める）
・本文（概要 → IPについて → DLEより）
・会社概要定型文（必ず末尾に付ける）

Google Search Groundingを使って最新情報を必ず確認し、古い数字は使わないこと。`;
  };

  const buildScoringPrompt = (pressRelease) => {
    return `以下のプレスリリースを4軸で採点し、改善提案3点を返してください。

【プレスリリース】
${pressRelease}

【採点軸】
1. ニュース性（0〜100）：メディアが取り上げたくなる新規性・話題性
2. DLEらしさ（0〜100）：文体・数字・IP愛・展望文が揃っているか
3. タイトル強度（0〜100）：40字以内・感嘆符・IP名前出しができているか
4. メディア掲載可能性（0〜100）：編集者が使いやすい構成か

【出力形式（必ずこのJSON形式のみで返答してください）】
{
  "scores": { "news": 数値, "dle": 数値, "title": 数値, "media": 数値 },
  "improvements": ["改善提案1", "改善提案2", "改善提案3"]
}`;
  };

  // ===== COLLECT FORM DATA =====
  const collectFormData = () => {
    const isPaste = currentTab === 'paste';
    const ip = isPaste ? formValues.relatedIpPaste : formValues.relatedIp;
    const company = isPaste ? formValues.relatedCompanyPaste : formValues.relatedCompany;
    const notes = isPaste ? '' : formValues.extraNotes;

    if (isPaste) {
      return {
        type: currentType,
        ip,
        company,
        pasteContent: formValues.pasteContent,
        mode: 'paste'
      };
    }

    const base = { type: currentType, ip, company, notes, mode: 'form' };
    switch (currentType) {
      case 'kuji':
        return {
          ...base,
          title: formValues.kujiTitle,
          date: formValues.kujiDate,
          price: formValues.kujiPrice,
          goods: formValues.kujiGoods,
          campaign: formValues.kujiCampaign
        };
      case 'media':
        return {
          ...base,
          mediaName: formValues.mediaName,
          date: formValues.mediaDate,
          articleTitle: formValues.mediaArticleTitle,
          url: formValues.mediaUrl,
          persons: formValues.mediaPersons,
          summary: formValues.mediaSummary
        };
      case 'content':
        return {
          ...base,
          contentType: formValues.contentType,
          date: formValues.contentDate,
          url: formValues.contentUrl,
          broadcast: formValues.contentBroadcast,
          detail: formValues.contentDetail
        };
      case 'sp':
        return {
          ...base,
          client: formValues.spClient,
          collabType: formValues.spCollabType,
          date: formValues.spDate,
          url: formValues.spUrl,
          summary: formValues.spSummary,
          copy: formValues.spCopy
        };
      case 'popup':
        return {
          ...base,
          store: formValues.popupStore,
          concept: formValues.popupConcept,
          period: formValues.popupPeriod,
          artist: formValues.popupArtist,
          address: formValues.popupAddress,
          items: formValues.popupItems,
          events: formValues.popupEvents
        };
      default:
        return base;
    }
  };

  // ===== GENERATION API CLIENT CALL =====
  const generatePressRelease = async () => {
    if (!currentType) {
      showToast('まずリリースの型を選択してください');
      return;
    }
    const data = collectFormData();
    if (!data.ip) {
      showToast('関連IPを選択してください');
      return;
    }

    setIsGenerating(true);
    setSavedDocUrl('');
    setErrorMsg('');
    setLastGeneratedText('');
    setLoadingPhase('🔍 Google Search Grounding で最新のIP実績情報を取得中...');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(),
          userPrompt: buildUserPrompt(data)
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `APIサーバーエラー (${res.status})`);
      }

      const resData = await res.json();
      const text = resData.text;

      // Extract title candidate from text
      let extractedTitle = '';
      const titleMatch = text.match(/(?:【|■|タイトル：|タイトル\n|タイトル)?([^\n]+「[^」\n]+」[^\n]+|[^\n]+『[^』\n]+』[^\n]+)/i);
      if (titleMatch) {
        extractedTitle = titleMatch[1].replace(/【|】|■|タイトル：|タイトル/g, '').trim().substring(0, 40);
      }
      setPressReleaseTitle(extractedTitle || '新規プレスリリース');
      setLastGeneratedText(text);

      // Perform grading automatically
      await scoreRelease(text);
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || '生成処理中に予期せぬエラーが発生しました。');
      setIsGenerating(false);
    }
  };

  const scoreRelease = async (text) => {
    setIsScoring(true);
    setLoadingPhase('📊 DLE品質4軸評価と改善ポイントを算出中...');
    
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildScoringPrompt(text) })
      });

      if (!res.ok) throw new Error('採点処理でエラーが発生しました');

      const data = await res.json();
      const match = data.text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('採点結果のフォーマットが不正です');
      
      const parsed = JSON.parse(match[0]);
      setScores({
        news: parsed.scores?.news || 0,
        dle: parsed.scores?.dle || 0,
        title: parsed.scores?.title || 0,
        media: parsed.scores?.media || 0
      });
      setImprovements(parsed.improvements || []);
    } catch (e) {
      console.error(e);
      setImprovements(['評価結果をパースできませんでした。再試行してください。']);
    } finally {
      setIsScoring(false);
      setIsGenerating(false);
      setTimeout(() => {
        document.getElementById('result-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  };

  // ===== GOOGLE DRIVE API MULTI-PART UPLOAD =====
  const saveToGoogleDrive = async () => {
    if (!accessToken || !lastGeneratedText) return;
    setIsSavingToDrive(true);
    setSavedDocUrl('');

    try {
      // 1. Check or Create "DLE_プレスリリース生成" folder
      let folderId = '';
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='DLE_プレスリリース生成' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      const searchData = await searchRes.json();

      if (searchData.files && searchData.files.length > 0) {
        folderId = searchData.files[0].id;
      } else {
        const createFolderRes = await fetch(
          'https://www.googleapis.com/drive/v3/files',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: 'DLE_プレスリリース生成',
              mimeType: 'application/vnd.google-apps.folder'
            })
          }
        );
        const folderData = await createFolderRes.json();
        folderId = folderData.id;
      }

      // 2. Upload Plain Text and Convert to Google Doc (application/vnd.google-apps.document)
      const docTitle = `${pressReleaseTitle || 'プレスリリース'}_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}`;
      
      const metadata = {
        name: docTitle,
        mimeType: 'application/vnd.google-apps.document',
        parents: [folderId]
      };

      const boundary = 'dle_multipart_boundary';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;
      
      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
        lastGeneratedText +
        closeDelimiter;

      const createDocRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody
        }
      );

      if (!createDocRes.ok) {
        throw new Error('Googleドキュメントのアップロードに失敗しました。');
      }

      const docData = await createDocRes.json();
      const docUrl = `https://docs.google.com/document/d/${docData.id}/edit`;
      setSavedDocUrl(docUrl);
      showToast('Google Driveにドキュメントを保存しました！');
    } catch (e) {
      console.error(e);
      showToast('Google Drive保存中にエラーが発生しました。');
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const copyResult = () => {
    if (!lastGeneratedText) return;
    navigator.clipboard.writeText(lastGeneratedText).then(() => {
      showToast('クリップボードにコピーしました');
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f3] font-sans antialiased text-[#1a1a1a]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-[#e0dfd9] bg-white px-6 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a2540] font-outfit text-sm font-bold text-[#d4a84b] tracking-wider">
              DLE
            </div>
            <div>
              <h1 className="font-outfit text-sm font-bold text-[#1a2540] tracking-wide">DLE PR GENERATOR</h1>
              <p className="text-[10px] uppercase font-medium text-[#9e9e9e] tracking-widest">Web App with Google Drive</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full border border-[#e0dfd9]" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8ecf4] font-semibold text-[#1a2540]">
                    {user.name?.charAt(0)}
                  </div>
                )}
                <div className="hidden text-right md:block">
                  <p className="text-xs font-semibold text-[#1a2540]">{user.name}</p>
                  <p className="text-[9px] text-[#6b6b6b]">{user.email}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e0dfd9] text-[#6b6b6b] transition hover:bg-[#f0efed] hover:text-[#c0392b]"
                  title="ログアウト"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 rounded-lg bg-[#1a2540] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2c3e60]"
              >
                <Lock className="h-3.5 w-3.5" />
                Googleでサインイン
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* NON-LOGGED-IN COVER SCREEN */}
        {!user && !isAuthLoading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#e0dfd9] bg-white px-8 py-16 text-center shadow-md">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#fdf6ec] text-[#b8923a]">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="mb-3 font-outfit text-2xl font-bold text-[#1a2540] tracking-tight md:text-3xl">DLE 広報プレスリリース自動生成ツール</h2>
            <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-[#6b6b6b]">
              本ツールはDLE社員専用のAIアシスタントです。Google Workspaceのアカウントでサインインすることで、どなたでもAPIキーの設定不要ですぐに生成・Google Driveへの自動保存機能をご利用いただけます。
            </p>
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 rounded-xl bg-[#1a2540] px-8 py-4 text-sm font-semibold text-white shadow-md transition hover:bg-[#2c3e60] hover:shadow-lg active:scale-95"
            >
              <Lock className="h-4 w-4" />
              Googleアカウントでログインして始める
            </button>
          </div>
        )}

        {isAuthLoading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin-custom rounded-full border-2 border-[#e0dfd9] border-t-[#1a2540]"></div>
            <p className="mt-4 text-xs font-medium text-[#6b6b6b]">サインイン状況を確認中...</p>
          </div>
        )}

        {/* LOGGED IN MAIN APP SCREEN */}
        {user && (
          <div className="space-y-12">
            {/* INTRO */}
            <div className="border-b border-[#e0dfd9] pb-8">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-[#b8923a] tracking-widest uppercase">
                <span className="h-[1.5px] w-4 bg-[#b8923a]"></span>
                AI Powered &bull; Google Drive Integration
              </div>
              <h2 className="mb-3 font-outfit text-2xl font-bold text-[#1a2540] tracking-tight md:text-3xl">プレスリリース自動生成</h2>
              <p className="text-sm leading-relaxed text-[#6b6b6b]">
                作成したいプレスリリースの「型」を選択し、案件情報を入力してください。
                Google Search Grounding を有効にして、YouTubeの最新数字や放送・配信状況などを自動で検索し、完璧なDLE広報文体で原稿を仕上げます。
              </p>
            </div>

            {/* STEP 1: CAMPAIGN TYPE SELECTION */}
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1a2540] font-outfit text-[10px] font-bold text-white">1</span>
                <h3 className="font-outfit text-base font-bold text-[#1a2540] tracking-wide">リリースの型を選択</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                {[
                  { id: 'kuji', emoji: '🎰', name: 'オンラインくじ' },
                  { id: 'media', emoji: '📰', name: 'メディア掲載' },
                  { id: 'content', emoji: '🎬', name: 'コンテンツ解禁' },
                  { id: 'sp', emoji: '📣', name: 'セールスプロモ' },
                  { id: 'popup', emoji: '🏪', name: 'POP UP STORE' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => selectType(item.id)}
                    className={`relative flex flex-col items-center justify-center rounded-2xl border bg-white p-5 text-center shadow-sm transition hover:border-[#1a2540] hover:shadow-md hover:-translate-y-0.5 ${
                      currentType === item.id 
                        ? 'border-[#1a2540] bg-[#e8ecf4] ring-1 ring-[#1a2540]' 
                        : 'border-[#e0dfd9]'
                    }`}
                  >
                    {currentType === item.id && (
                      <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-[#1a2540] text-[9px] text-white">✓</span>
                    )}
                    <span className="mb-3 text-3xl">{item.emoji}</span>
                    <span className={`text-xs font-semibold tracking-tight ${currentType === item.id ? 'text-[#1a2540]' : 'text-[#3d3d3d]'}`}>{item.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* ANCHOR FOR ANIMATED SCROLL */}
            <div id="step2-anchor"></div>

            {/* STEP 2: FIELDS INPUT FORM */}
            {currentType && (
              <section className="space-y-6 rounded-2xl border border-[#e0dfd9] bg-white p-6 md:p-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#e0dfd9] pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1a2540] font-outfit text-[10px] font-bold text-white">2</span>
                    <h3 className="font-outfit text-base font-bold text-[#1a2540] tracking-wide">案件情報を入力</h3>
                  </div>
                  
                  {/* TAB SWITCHER */}
                  <div className="flex rounded-lg bg-[#f0efed] p-1">
                    <button 
                      onClick={() => switchTab('form')}
                      className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${currentTab === 'form' ? 'bg-white text-[#1a2540] shadow-sm' : 'text-[#6b6b6b]'}`}
                    >
                      フォーム入力
                    </button>
                    <button 
                      onClick={() => switchTab('paste')}
                      className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${currentTab === 'paste' ? 'bg-white text-[#1a2540] shadow-sm' : 'text-[#6b6b6b]'}`}
                    >
                      原稿貼り付け
                    </button>
                  </div>
                </div>

                {/* TAB 1: STRUCTURED FORM INPUTS */}
                {currentTab === 'form' && (
                  <div className="space-y-6">
                    {/* CAMPAIGN SPECIFIC FORMS */}
                    {currentType === 'kuji' && (
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">くじタイトル <span className="text-[#c0392b]">*</span></label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：第2弾 秘密結社 鷹の爪 アニバーサリーくじ"
                            value={formValues.kujiTitle}
                            onChange={(e) => handleInputChange('kujiTitle', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">発売開始日 <span className="text-[#c0392b]">*</span></label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：2025年7月15日（火）"
                            value={formValues.kujiDate}
                            onChange={(e) => handleInputChange('kujiDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">価格（1口）</label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：1,000円（税込）"
                            value={formValues.kujiPrice}
                            onChange={(e) => handleInputChange('kujiPrice', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">グッズ概要 <span className="text-[#c0392b]">*</span></label>
                          <textarea 
                            rows="3"
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：A賞 アクリルスタンド（全5種）、B賞 缶バッジセット..."
                            value={formValues.kujiGoods}
                            onChange={(e) => handleInputChange('kujiGoods', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">キャンペーン補足</label>
                          <textarea 
                            rows="2"
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：10口購入でオリジナルコレクションブック1冊プレゼント、ダブルチャンス応募..."
                            value={formValues.kujiCampaign}
                            onChange={(e) => handleInputChange('kujiCampaign', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {currentType === 'media' && (
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">媒体名 <span className="text-[#c0392b]">*</span></label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：マイナビニュース"
                            value={formValues.mediaName}
                            onChange={(e) => handleInputChange('mediaName', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">掲載日</label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：2025年6月15日"
                            value={formValues.mediaDate}
                            onChange={(e) => handleInputChange('mediaDate', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">記事タイトル（原文） <span className="text-[#c0392b]">*</span></label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：鷹の爪団が新グッズ発表！アニバーサリー企画始動"
                            value={formValues.mediaArticleTitle}
                            onChange={(e) => handleInputChange('mediaArticleTitle', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">掲載URL</label>
                          <input 
                            type="url" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="https://..."
                            value={formValues.mediaUrl}
                            onChange={(e) => handleInputChange('mediaUrl', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">登場人物・出演者</label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：FROGMAN監督、総統"
                            value={formValues.mediaPersons}
                            onChange={(e) => handleInputChange('mediaPersons', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">内容概要 <span className="text-[#c0392b]">*</span></label>
                          <textarea 
                            rows="3"
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="記事の内容を分かりやすくまとめてください"
                            value={formValues.mediaSummary}
                            onChange={(e) => handleInputChange('mediaSummary', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {currentType === 'content' && (
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">解禁コンテンツの種類 <span className="text-[#c0392b]">*</span></label>
                          <select 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            value={formValues.contentType}
                            onChange={(e) => handleInputChange('contentType', e.target.value)}
                          >
                            <option value="">選択してください</option>
                            <option>本PV（プロモーションビデオ）</option>
                            <option>ノンクレOP（ノンクレジットオープニング）</option>
                            <option>ノンクレED（ノンクレジットエンディング）</option>
                            <option>キービジュアル</option>
                            <option>予告映像</option>
                            <option>特報映像</option>
                            <option>キャラクタービジュアル</option>
                            <option>主題歌MV</option>
                            <option>その他</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">解禁日 <span className="text-[#c0392b]">*</span></label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：2025年6月20日"
                            value={formValues.contentDate}
                            onChange={(e) => handleInputChange('contentDate', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">公開先URL</label>
                          <input 
                            type="url" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="https://..."
                            value={formValues.contentUrl}
                            onChange={(e) => handleInputChange('contentUrl', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">放送局・配信先</label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：テレ東系 / ニコニコ動画 / YouTube"
                            value={formValues.contentBroadcast}
                            onChange={(e) => handleInputChange('contentBroadcast', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">詳細・補足 <span className="text-[#c0392b]">*</span></label>
                          <textarea 
                            rows="3"
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="コンテンツの詳細、制作陣、声優情報、あらすじ等を記載してください"
                            value={formValues.contentDetail}
                            onChange={(e) => handleInputChange('contentDetail', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {currentType === 'sp' && (
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">クライアント企業名 <span className="text-[#c0392b]">*</span></label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：株式会社◯◯"
                            value={formValues.spClient}
                            onChange={(e) => handleInputChange('spClient', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">コラボ内容の種類</label>
                          <select 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            value={formValues.spCollabType}
                            onChange={(e) => handleInputChange('spCollabType', e.target.value)}
                          >
                            <option value="">選択してください</option>
                            <option>WEB CM</option>
                            <option>SNSキャンペーン</option>
                            <option>コラボ商品</option>
                            <option>ブランドタイアップ</option>
                            <option>デジタル広告</option>
                            <option>イベントコラボ</option>
                            <option>その他</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">公開日</label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：2025年6月1日"
                            value={formValues.spDate}
                            onChange={(e) => handleInputChange('spDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">公開URL</label>
                          <input 
                            type="url" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="https://..."
                            value={formValues.spUrl}
                            onChange={(e) => handleInputChange('spUrl', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">企画概要 <span className="text-[#c0392b]">*</span></label>
                          <textarea 
                            rows="3"
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="タイアップの内容・目的・詳細を記載してください"
                            value={formValues.spSummary}
                            onChange={(e) => handleInputChange('spSummary', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">キャッチコピー案</label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：屋根裏のアイツを撃退！？"
                            value={formValues.spCopy}
                            onChange={(e) => handleInputChange('spCopy', e.target.value)}
                          />
                          <p className="mt-1 text-[10px] text-[#9e9e9e]">タイトルの書き出しに使用されます（例：「屋根裏のアイツを撃退！？」鷹の爪団と〇〇がタイアップ！）</p>
                        </div>
                      </div>
                    )}

                    {currentType === 'popup' && (
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">開催店舗名 <span className="text-[#c0392b]">*</span></label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：渋谷ロフト"
                            value={formValues.popupStore}
                            onChange={(e) => handleInputChange('popupStore', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">コンセプト名</label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：〜世界征服のおみやげ展〜"
                            value={formValues.popupConcept}
                            onChange={(e) => handleInputChange('popupConcept', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">開催期間 <span className="text-[#c0392b]">*</span></label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：2025年7月1日（火）〜7月31日（木）"
                            value={formValues.popupPeriod}
                            onChange={(e) => handleInputChange('popupPeriod', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">描き下ろし担当者</label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：FROGMAN"
                            value={formValues.popupArtist}
                            onChange={(e) => handleInputChange('popupArtist', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">住所</label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：東京都渋谷区宇田川町21-1 渋谷ロフト2F"
                            value={formValues.popupAddress}
                            onChange={(e) => handleInputChange('popupAddress', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">商品ラインナップ</label>
                          <textarea 
                            rows="2"
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：描き下ろしキービジュアルアクリルスタンド（全10種）、限定クリアファイル..."
                            value={formValues.popupItems}
                            onChange={(e) => handleInputChange('popupItems', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">特別企画・イベント</label>
                          <textarea 
                            rows="2"
                            className="w-full rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                            placeholder="例：来場者先着200名にステッカープレゼント、Instagram投稿キャンペーン..."
                            value={formValues.popupEvents}
                            onChange={(e) => handleInputChange('popupEvents', e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* COMMON FORM FIELDS */}
                    <div className="mt-8 rounded-xl bg-[#f0efed] p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#6b6b6b]">共通項目</span>
                        <div className="h-[1px] flex-1 bg-[#e0dfd9]"></div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">関連IP <span className="text-[#c0392b]">*</span></label>
                          <select 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-white px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540]"
                            value={formValues.relatedIp}
                            onChange={(e) => handleInputChange('relatedIp', e.target.value)}
                          >
                            <option value="">選択してください</option>
                            <option>秘密結社 鷹の爪</option>
                            <option>そろ谷のアニメっち</option>
                            <option>野原ひろし 昼メシの流儀</option>
                            <option>貝社員</option>
                            <option>Fate/Grand Order 藤丸立香はわからない</option>
                            <option>小3アシベ QQゴマちゃん</option>
                            <option>ぽちゃーズ</option>
                            <option>耐え子の日常</option>
                            <option>その他・新規</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">関連企業・パートナー</label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-white px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540]"
                            placeholder="例：アニプレックス株式会社、TYPE-MOON"
                            value={formValues.relatedCompany}
                            onChange={(e) => handleInputChange('relatedCompany', e.target.value)}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">補足・備考</label>
                          <textarea 
                            rows="2"
                            className="w-full rounded-lg border border-[#e0dfd9] bg-white px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540]"
                            placeholder="生成AIへの追加指示や特記事項"
                            value={formValues.extraNotes}
                            onChange={(e) => handleInputChange('extraNotes', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: RAW TEXT PASTE TAB */}
                {currentTab === 'paste' && (
                  <div className="space-y-6">
                    <div>
                      <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">原稿・情報をそのまま貼り付け</label>
                      <textarea 
                        rows="8"
                        className="w-full rounded-xl border border-[#e0dfd9] bg-[#fafaf8] p-4 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                        placeholder="プレスリリースの原稿、メール文、メモなど、情報をそのまま貼り付けてください。&#10;AIが内容を解析してDLE品質のプレスリリースを生成します。&#10;&#10;【例】&#10;タイトル：秘密結社 鷹の爪 オンラインくじ第2弾&#10;発売日：2025年7月15日&#10;内容：A賞アクリルスタンド全5種、B賞缶バッジ..."
                        value={formValues.pasteContent}
                        onChange={(e) => handleInputChange('pasteContent', e.target.value)}
                      />
                    </div>
                    
                    <div className="rounded-xl bg-[#f0efed] p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#6b6b6b]">共通項目</span>
                        <div className="h-[1px] flex-1 bg-[#e0dfd9]"></div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">関連IP <span className="text-[#c0392b]">*</span></label>
                          <select 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-white px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540]"
                            value={formValues.relatedIpPaste}
                            onChange={(e) => handleInputChange('relatedIpPaste', e.target.value)}
                          >
                            <option value="">選択してください</option>
                            <option>秘密結社 鷹の爪</option>
                            <option>そろ谷のアニメっち</option>
                            <option>野原ひろし 昼メシの流儀</option>
                            <option>貝社員</option>
                            <option>Fate/Grand Order 藤丸立香はわからない</option>
                            <option>小3アシベ QQゴマちゃん</option>
                            <option>ぽちゃーズ</option>
                            <option>耐え子の日常</option>
                            <option>その他・新規</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold text-[#3d3d3d]">関連企業・パートナー</label>
                          <input 
                            type="text" 
                            className="w-full rounded-lg border border-[#e0dfd9] bg-white px-4 py-2.5 text-sm text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540]"
                            placeholder="例：アニプレックス株式会社"
                            value={formValues.relatedCompanyPaste}
                            onChange={(e) => handleInputChange('relatedCompanyPaste', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* STEP 3: MEDIA & VIDEO TOOLS */}
            {currentType && (
              <section className="space-y-6 rounded-2xl border border-[#e0dfd9] bg-white p-6 md:p-8 shadow-sm">
                <div className="flex items-center gap-2 border-b border-[#e0dfd9] pb-4">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1a2540] font-outfit text-[10px] font-bold text-white">3</span>
                  <h3 className="font-outfit text-base font-bold text-[#1a2540] tracking-wide">画像・動画素材（任意）</h3>
                </div>

                {/* DROP ZONE */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e0dfd9] bg-[#fafaf8] py-12 text-center cursor-pointer transition hover:border-[#1a2540] hover:bg-[#e8ecf4]"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    multiple 
                    accept="image/*,video/*" 
                    className="hidden" 
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm transition group-hover:scale-110">
                    <Upload className="h-6 w-6 text-[#6b6b6b] group-hover:text-[#1a2540]" />
                  </div>
                  <p className="mb-1 text-sm font-semibold text-[#3d3d3d]">ファイルをドラッグ＆ドロップ、またはクリックして選択</p>
                  <p className="text-xs text-[#9e9e9e]">JPG &bull; PNG &bull; GIF &bull; MP4 &bull; MOV などの複数ファイルに対応</p>
                </div>

                {/* MEDIA PREVIEW LIST */}
                {uploadedFiles.length > 0 && (
                  <div className="rounded-xl border border-[#e0dfd9] p-4 bg-[#fafaf8]">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#6b6b6b]">{uploadedFiles.length} 件のファイル</span>
                      <button 
                        onClick={downloadAllMedia}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#1a2540] hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        全件ダウンロード
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                      {uploadedFiles.map((file, idx) => {
                        const isImg = file.type.startsWith('image/');
                        const objUrl = URL.createObjectURL(file);
                        return (
                          <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl border border-[#e0dfd9] bg-[#e0dfd9]">
                            {isImg ? (
                              <img src={objUrl} alt={file.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[#f0efed] text-3xl">🎬</div>
                            )}
                            
                            {/* HOVER OVERLAY */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1a2540]/80 opacity-0 transition group-hover:opacity-100">
                              <button 
                                onClick={() => downloadSingleMedia(file)}
                                className="rounded bg-white/20 border border-white/30 px-3 py-1 text-[10px] font-bold text-white transition hover:bg-white/40"
                              >
                                ダウンロード
                              </button>
                              <button 
                                onClick={() => removeMedia(idx)}
                                className="rounded bg-[#c0392b] px-3 py-1 text-[10px] font-bold text-white transition hover:bg-[#c0392b]/80"
                              >
                                削除
                              </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 text-[9px] text-white truncate">
                              {file.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* YOUTUBE CONVERTER */}
                <div className="rounded-xl border border-[#e0dfd9] bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex items-center gap-1 bg-[#ff0000] px-2 py-0.5 rounded text-[9px] font-extrabold text-white uppercase tracking-wider">
                      <Youtube className="h-3 w-3 fill-white" />
                      YouTube
                    </span>
                    <h4 className="text-xs font-bold text-[#3d3d3d]">URL を PR TIMES用 iframeコードに変換</h4>
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      className="flex-1 rounded-lg border border-[#e0dfd9] bg-[#fafaf8] px-4 py-2 text-xs text-[#1a1a1a] shadow-sm outline-none transition focus:border-[#1a2540] focus:bg-white"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={ytUrl}
                      onChange={(e) => setYtUrl(e.target.value)}
                    />
                    <button 
                      onClick={generateYtIframe}
                      className="rounded-lg bg-[#f0efed] border border-[#d0cfc8] px-5 py-2 text-xs font-semibold text-[#3d3d3d] hover:bg-[#1a2540] hover:text-white hover:border-[#1a2540] transition"
                    >
                      コード生成
                    </button>
                  </div>

                  {ytIframe && (
                    <div className="mt-3 rounded-lg bg-[#f0efed] border border-[#e0dfd9] p-3 font-mono text-[10px] text-[#6b6b6b] break-all select-all leading-normal">
                      {ytIframe}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* GENERATE ACTION BUTTON */}
            {currentType && !isGenerating && (
              <div className="flex justify-center py-6">
                <button
                  onClick={generatePressRelease}
                  className="flex items-center gap-2.5 rounded-2xl bg-[#1a2540] px-12 py-5 font-outfit text-base font-bold text-white shadow-md transition hover:bg-[#2c3e60] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Sparkles className="h-5 w-5 text-[#d4a84b] fill-[#d4a84b]" />
                  プレスリリースを生成する
                </button>
              </div>
            )}

            {/* LOADING SCREEN */}
            {isGenerating && (
              <div className="rounded-2xl border border-[#e0dfd9] bg-white p-12 text-center shadow-md animate-pulse">
                <div className="mx-auto mb-6 h-12 w-12 animate-spin-custom rounded-full border-3 border-[#e0dfd9] border-t-[#1a2540]"></div>
                <h4 className="mb-2 text-sm font-bold text-[#1a2540]">AIプレスリリース生成中</h4>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e8d5b0] bg-[#fdf6ec] px-4 py-1.5 text-xs text-[#b8923a]">
                  {loadingPhase}
                </div>
              </div>
            )}

            {/* ANCHOR FOR RESULTS SCROLL */}
            <div id="result-anchor"></div>

            {/* ERROR DISPLAY */}
            {errorMsg && (
              <div className="flex gap-3 rounded-2xl border border-[#f5c6c3] bg-[#fdf2f2] p-5 text-sm text-[#c0392b]">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold">エラーが発生しました</h4>
                  <p className="mt-1 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* RESULT SECTION */}
            {lastGeneratedText && !isGenerating && (
              <section className="space-y-6">
                <div className="flex flex-col gap-4 border-b border-[#e0dfd9] pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#1a2540]" />
                    <h3 className="font-outfit text-base font-bold text-[#1a2540] tracking-wide">生成されたプレスリリース</h3>
                  </div>

                  <div className="flex gap-2">
                    {/* SAVE TO GOOGLE DRIVE */}
                    <button
                      onClick={saveToGoogleDrive}
                      disabled={isSavingToDrive}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e8d5b0] bg-[#fdf6ec] px-4 py-2 text-xs font-bold text-[#b8923a] transition hover:bg-[#e8d5b0] hover:text-[#1a2540] disabled:opacity-50"
                    >
                      {isSavingToDrive ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#b8923a] border-t-transparent"></span>
                      ) : (
                        <FolderOpen className="h-3.5 w-3.5" />
                      )}
                      Google Driveに保存
                    </button>

                    <button
                      onClick={copyResult}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e0dfd9] bg-white px-4 py-2 text-xs font-bold text-[#3d3d3d] shadow-sm transition hover:border-[#1a2540] hover:text-[#1a2540]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      コピー
                    </button>

                    <button
                      onClick={generatePressRelease}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e0dfd9] bg-white px-4 py-2 text-xs font-bold text-[#3d3d3d] shadow-sm transition hover:border-[#1a2540] hover:text-[#1a2540]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      再生成
                    </button>
                  </div>
                </div>

                {/* DRIVE SAVE COMPLETED LINK */}
                {savedDocUrl && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800 animate-bounce">
                    <div className="flex items-center gap-2.5 text-xs font-bold">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      Google Drive の「DLE_プレスリリース生成」フォルダに保存されました！
                    </div>
                    <a
                      href={savedDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      Google ドキュメントで開く
                    </a>
                  </div>
                )}

                {/* PRESS RELEASE CANVAS */}
                <div className="rounded-2xl border border-[#e0dfd9] bg-white p-8 font-sans text-sm leading-loose text-[#3d3d3d] whitespace-pre-wrap shadow-sm">
                  {lastGeneratedText}
                </div>

                {/* SCORING METERS */}
                {!isScoring && (
                  <div className="rounded-2xl border border-[#e0dfd9] bg-white p-6 md:p-8 shadow-sm space-y-6">
                    <div className="border-b border-[#e0dfd9] pb-4">
                      <h4 className="font-outfit text-sm font-bold text-[#1a2540] tracking-wider uppercase">DLE品質 4軸自動スコア</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                      {[
                        { key: 'news', label: '📰 ニュース性', val: scores.news },
                        { key: 'dle', label: '🦅 DLEらしさ', val: scores.dle },
                        { key: 'title', label: '💥 タイトル強度', val: scores.title },
                        { key: 'media', label: '📺 メディア掲載率', val: scores.media }
                      ].map(meter => (
                        <div key={meter.key} className="text-center">
                          <p className="text-[10px] font-bold text-[#6b6b6b]">{meter.label}</p>
                          <p className="font-outfit text-3xl font-extrabold text-[#1a2540] mt-2 mb-3">{meter.val}<span className="text-xs text-[#9e9e9e] font-normal">/100</span></p>
                          <div className="h-1.5 w-full bg-[#f0efed] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#1a2540] rounded-full transition-all duration-1000"
                              style={{ width: `${meter.val}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* RECOMMENDATIONS */}
                    {improvements.length > 0 && (
                      <div className="rounded-xl border border-[#e8d5b0] bg-[#fdf6ec] p-5">
                        <h5 className="mb-4 flex items-center gap-2 text-xs font-bold text-[#b8923a] uppercase tracking-wider">
                          <Sparkles className="h-4 w-4" />
                          DLE広報部からの改善提案
                        </h5>
                        <ul className="space-y-3">
                          {improvements.map((tip, idx) => (
                            <li key={idx} className="flex gap-3 text-xs leading-relaxed text-[#3d3d3d]">
                              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#1a2540] text-[10px] font-extrabold text-white font-outfit">{idx + 1}</div>
                              <div>{tip}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      {/* TOAST SYSTEM */}
      <div 
        className={`fixed bottom-8 right-8 z-50 rounded-xl bg-[#b8923a] px-6 py-3.5 text-xs font-bold text-white shadow-lg transition-all duration-300 ${
          showToastFlag ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        {toastMsg}
      </div>
    </div>
  );
}
