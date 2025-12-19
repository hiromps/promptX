import React, { useState, useEffect } from 'react';
import {
  Copy, Plus, Search, Trash2, Moon, Sun, Check, Tag, X, Share, ArrowLeft, Globe, Loader2, Star, Download, Upload, ExternalLink
} from 'lucide-react';
import {
  auth, db, appId,
  signInAnonymously, onAuthStateChanged,
  collection, addDoc, getDoc, doc, serverTimestamp
} from './firebase';

const LOCAL_STORAGE_KEY = 'promptx_prompts';

export default function App() {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('すべて');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [shareId, setShareId] = useState(null);
  const [sharedPromptData, setSharedPromptData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Load prompts & Handle Share ID
  useEffect(() => {
    // 1. Auth Initialization
    const initAuth = async () => {
      try {
        console.log("Starting anonymous auth...");
        await signInAnonymously(auth);
        console.log("Auth success");
      } catch (err) {
        console.error("Auth failed:", err);
        showToast('認証に失敗しました。ページを再読み込みしてください。');
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    // 2. Local Storage
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      setPrompts(JSON.parse(saved));
    }

    // 3. Share Preview
    const params = new URLSearchParams(window.location.search);
    const id = params.get('shareId');
    if (id) {
      setShareId(id);
      fetchSharedPrompt(id);
    }

    return () => unsubscribe();
  }, []);

  // Save prompts to local storage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prompts));
  }, [prompts]);

  // Handle Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const fetchSharedPrompt = async (id) => {
    setLoading(true);
    try {
      // Data is stored in: artifacts / {appId} / public / data / prompts
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'prompts', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSharedPromptData({ id: docSnap.id, ...docSnap.data() });
      } else {
        showToast('プロンプトが見つかりませんでした');
      }
    } catch (err) {
      console.error(err);
      showToast('読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = () => {
    setSelectedPrompt({ id: Date.now(), title: '', content: '', tags: [], isFavorite: false });
  };

  const handleSave = (updated) => {
    if (prompts.find(p => p.id === updated.id)) {
      setPrompts(prompts.map(p => p.id === updated.id ? updated : p));
    } else {
      setPrompts([updated, ...prompts]);
    }
    showToast('ローカルに保存しました');
  };

  const toggleFavorite = (id) => {
    setPrompts(prompts.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
    if (selectedPrompt?.id === id) {
      setSelectedPrompt({ ...selectedPrompt, isFavorite: !selectedPrompt.isFavorite });
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(prompts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'promptx_backup.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast('バックアップを書き出しました');
  };

  const handleImport = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = e => {
      try {
        const json = JSON.parse(e.target.result);
        setPrompts(json);
        showToast('バックアップを復元しました');
      } catch (err) {
        showToast('ファイルの読み込みに失敗しました');
      }
    };
  };

  const handleDelete = (id) => {
    if (window.confirm('このプロンプトを削除しますか？')) {
      setPrompts(prompts.filter(p => p.id !== id));
      setSelectedPrompt(null);
      showToast('削除しました');
    }
  };

  const handleShare = async (prompt) => {
    if (!user) {
      showToast('認証中です。しばらくお待ちください');
      return;
    }
    try {
      showToast('シエアURLを発行中...');
      const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'prompts');
      const docRef = await addDoc(collectionRef, {
        title: prompt.title || '無題のプロンプト',
        content: prompt.content,
        tags: prompt.tags || [],
        creatorId: user.uid,
        createdAt: serverTimestamp(),
      });

      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}?shareId=${docRef.id}`;

      const tweetText = `プロンプトを共有しました: ${prompt.title}\n\n#PromptX #AI`;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;

      window.open(twitterUrl, '_blank');
      showToast('Firestoreに公開し、Xにシェアしました！');
    } catch (err) {
      console.error(err);
      showToast('シェアに失敗しました');
    }
  };

  const allTags = ['すべて', ...new Set(prompts.flatMap(p => p.tags || []))];

  const sortedPrompts = [...prompts].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.id - a.id;
  });

  const filteredPrompts = sortedPrompts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = activeTag === 'すべて' || (p.tags && p.tags.includes(activeTag));
    return matchesSearch && matchesTag;
  });

  if (shareId) {
    return (
      <div className="app-container fade-in">
        <header>
          <div className="logo cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="logo-icon">X</div>
            <span>PromptX</span>
          </div>
          <button onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>
        <main className="main-content" style={{ gridTemplateColumns: '1fr' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
              <Loader2 className="animate-spin" />
            </div>
          ) : sharedPromptData ? (
            <SharedView data={sharedPromptData} onCopy={() => showToast('コピーしました！')} />
          ) : (
            <div style={{ textAlign: 'center', padding: '100px' }}>プロンプトが見つかりません。</div>
          )}
        </main>
        {toast && <div className="toast"><Check size={18} /> {toast}</div>}
      </div>
    );
  }

  return (
    <div className="app-container fade-in">
      <header>
        <div className="logo">
          <div className="logo-icon">X</div>
          <span>PromptX</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button onClick={handleExport} title="バックアップ（JSON出力）" style={{ color: 'var(--muted-text)' }}>
            <Download size={20} />
          </button>
          <label title="リストを読み込む" style={{ cursor: 'pointer', color: 'var(--muted-text)', display: 'flex' }}>
            <Upload size={20} />
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> 新規作成
          </button>
        </div>
      </header>

      <main className="main-content">
        <aside className={`sidebar ${selectedPrompt ? 'hidden' : ''}`}>
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="プロンプトを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="tag-filters">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-filter-btn ${activeTag === tag ? 'active' : ''}`}
                onClick={() => setActiveTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="prompt-list">
            {filteredPrompts.map(p => (
              <div
                key={p.id}
                className={`prompt-card ${selectedPrompt?.id === p.id ? 'active' : ''}`}
                onClick={() => setSelectedPrompt(p)}
              >
                <h3>{p.title || '無題'}</h3>
                <Star
                  className={`star-icon ${p.isFavorite ? 'active' : ''}`}
                  size={16}
                  fill={p.isFavorite ? "currentColor" : "none"}
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                />
                <p>{p.content}</p>
                <div className="tag-container">
                  {p.tags.map(t => <span key={t} className="tag">#{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className={`editor-area ${!selectedPrompt ? 'hidden' : ''}`}>
          {selectedPrompt ? (
            <Editor
              data={selectedPrompt}
              onSave={handleSave}
              onDelete={handleDelete}
              onShare={handleShare}
              onCancel={() => setSelectedPrompt(null)}
              onToggleFavorite={() => toggleFavorite(selectedPrompt.id)}
              onCopy={() => showToast('コピーしました！')}
            />
          ) : (
            <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <Globe size={64} style={{ marginBottom: '16px' }} />
              <p>プロンプトを選択するか、新しく作成してください</p>
            </div>
          )}
        </section>
      </main>

      {toast && <div className="toast"><Check size={18} /> {toast}</div>}
    </div>
  );
}

function Editor({ data, onSave, onDelete, onShare, onCancel, onToggleFavorite, onCopy }) {
  const [formData, setFormData] = useState(data);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      setFormData({ ...formData, tags: [...new Set([...formData.tags, tagInput.trim()])] });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const openInTool = (baseUrl) => {
    navigator.clipboard.writeText(formData.content);
    onCopy();
    window.open(baseUrl, '_blank');
  };

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="md-hidden btn-icon" onClick={onCancel} style={{ marginRight: '8px' }}>
            <ArrowLeft size={20} />
          </button>
          <button
            className={`btn-icon ${formData.isFavorite ? 'active' : ''}`}
            onClick={onToggleFavorite}
            style={{ color: formData.isFavorite ? '#fbbf24' : 'var(--muted-text)' }}
          >
            <Star size={20} fill={formData.isFavorite ? "currentColor" : "none"} />
          </button>
          <button className="btn btn-outline btn-sm-compact" onClick={() => onShare(formData)}>
            <Share size={16} /> <span className="sm-hidden">シェアURL発行</span>
          </button>
          <button className="btn btn-outline btn-sm-compact" onClick={() => {
            navigator.clipboard.writeText(formData.content);
            onCopy();
          }}>
            <Copy size={16} /> <span className="sm-hidden">コピー</span>
          </button>
        </div>
        <button onClick={() => onDelete(formData.id)} style={{ color: '#ef4444' }}>
          <Trash2 size={20} />
        </button>
      </div>
      <div className="editor-body">
        <input
          className="editor-title"
          placeholder="プロンプトのタイトル..."
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
        <div className="tag-container">
          {formData.tags.map(t => (
            <span key={t} className="tag">
              #{t} <X size={12} onClick={() => removeTag(t)} style={{ cursor: 'pointer' }} />
            </span>
          ))}
          <input
            className="tag-input"
            placeholder="タグを追加..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <textarea
            className="editor-content"
            placeholder="プロンプトの内容を入力してください..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          />
          <div style={{ position: 'absolute', bottom: 0, right: 0, fontSize: '0.75rem', color: 'var(--muted-text)', padding: '8px' }}>
            {formData.content.length} 文字
          </div>
        </div>
        <button
          className="btn btn-primary"
          style={{ alignSelf: 'flex-end', padding: '12px 32px' }}
          onClick={() => onSave(formData)}
        >
          保存
        </button>
      </div>
      <div className="ai-links">
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted-text)', marginRight: '8px' }}>AIツールで開く:</span>
        <button className="ai-link-btn" onClick={() => openInTool('https://chat.openai.com')}>
          <ExternalLink size={14} /> ChatGPT
        </button>
        <button className="ai-link-btn" onClick={() => openInTool('https://claude.ai')}>
          <ExternalLink size={14} /> Claude
        </button>
        <button className="ai-link-btn" onClick={() => openInTool('https://gemini.google.com')}>
          <ExternalLink size={14} /> Gemini
        </button>
      </div>
    </div>
  );
}

function SharedView({ data, onCopy }) {
  return (
    <div className="shared-view" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div className="editor-container">
        <div className="editor-header">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{data.title}</h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--muted-text)' }}>
            {data.createdAt && new Date(data.createdAt.seconds * 1000).toLocaleDateString()}
          </span>
        </div>
        <div className="editor-body">
          <div className="tag-container" style={{ marginBottom: '16px' }}>
            {data.tags && data.tags.map(t => <span key={t} className="tag">#{t}</span>)}
          </div>
          <div style={{
            background: 'var(--secondary-bg)',
            padding: '24px',
            borderRadius: '16px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            marginBottom: '24px',
            border: '1px solid var(--border-color)'
          }}>
            {data.content}
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '16px', justifyContent: 'center', fontSize: '1rem' }}
            onClick={() => {
              navigator.clipboard.writeText(data.content);
              onCopy();
            }}
          >
            <Copy size={20} /> プロンプトをコピー
          </button>
        </div>
      </div>
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted-text)', marginBottom: '16px' }}>自分専用のプロンプト集を無料で作成</p>
        <button className="btn btn-outline" style={{ margin: '0 auto' }} onClick={() => window.location.href = '/'}>
          <Plus size={16} /> PromptX を使ってみる
        </button>
      </div>
    </div>
  );
}
