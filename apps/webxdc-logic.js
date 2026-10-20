//@ts-check
import {
  html,
  render,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "./deps/preact_and_htm.js";
import Fuse from "./deps/fuse.basic.esm.min.js";
import dayjs from "./deps/dayjs/dayjs_with_relative_time.min.js";
import "./deps/dayjs/localizedFormat.min.js.js";

//@ts-ignore
dayjs.extend(dayjs_plugin_relativeTime);
//@ts-ignore
dayjs.extend(dayjs_plugin_localizedFormat);

// without a trailing slash
const xdcget_export = "./xdcstore";

/** i18n helper — uses global t() from translations.js when available */
function tr(key, fallback) {
  try {
    if (typeof window.t === "function") {
      const v = window.t(key);
      if (v && v !== key) return v;
    }
  } catch (_) {}
  return fallback || key;
}

/*
Each <App> is implemented as a button that, when clicked, would show
more details about the webxdc app by showing a <Dialog> 
*/
const App = ({ app, toggleModal }) => {
  const subtitle = app.description.split('\n').shift();

  return html`
    <button
      class="app"
      onClick=${() => toggleModal(app.app_id)}
      key=${app.app_id}>
      <img src=${xdcget_export + "/" + app.icon_relname} loading="lazy" alt="Icon for ${app.name} app" />
      <div class="props ellipse">
        <div class="title ellipse">${app.name}</div>
        <div class="description ellipse">${subtitle}</div>
        <div class="author ellipse">${extract_author(app.source_code_url)}</div>
      </div>
    </button>
  `;
};

/*
Three download paths share one control:

1. Inside a webxdc (window.webxdc.sendToChat): the sandbox has no network and
   external https links are cancelled. Fetch the package (same-origin / files
   inside this .xdc first, then the absolute URL) and hand the bytes to
   sendToChat as a .xdc blob, falling back to base64. Do not navigate.
   importFiles is the wrong direction: it picks a file into this app.

2. Delta Chat's store webview (Android WebxdcStoreActivity, iOS
   WebxdcStoreViewController) adds the app only when the click is a real
   top-level navigation to a URL whose path ends in .xdc. It decides from the
   path, before response headers. target="_blank" is dropped: that WebView has
   no WebChromeClient.onCreateWindow. rel="noopener" asks for a new browsing
   context and is cancelled. The download attribute saves the file and skips
   the interceptor. iOS WKWebView cannot be told apart from Safari, so this
   anchor never sets target, rel, or download.

3. A normal browser follows the same URL. application/octet-stream (what
   madmail sends for .xdc) is saved as a file. Content-Disposition on the
   server makes the saved name reliable; it does not bypass the webview path.
*/
function xdcFileName(cacheRelname) {
  const base = String(cacheRelname || "").split("/").pop() || "app.xdc";
  return base.toLowerCase().endsWith(".xdc") ? base : base + ".xdc";
}

function xdcAbsoluteUrl(cacheRelname) {
  try {
    return new URL(xdcget_export + "/" + cacheRelname, window.location.href).href;
  } catch (_) {
    return xdcget_export + "/" + cacheRelname;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const comma = dataUrl.indexOf(",");
      if (comma < 0) {
        reject(new Error("base64"));
        return;
      }
      resolve(dataUrl.slice(comma + 1));
    };
    reader.onerror = () => reject(reader.error || new Error("base64"));
    reader.readAsDataURL(blob);
  });
}

async function fetchXdcBlob(cacheRelname) {
  const relative = xdcget_export + "/" + cacheRelname;
  const absolute = xdcAbsoluteUrl(cacheRelname);
  const urls = absolute && absolute !== relative ? [relative, absolute] : [relative];
  let lastError;
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("HTTP " + response.status);
      const blob = await response.blob();
      if (!blob || blob.size === 0) throw new Error("empty");
      return blob;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("fetch");
}

async function sendXdcToChat(app) {
  const webxdc = window.webxdc;
  const name = xdcFileName(app.cache_relname);
  const blob = await fetchXdcBlob(app.cache_relname);
  const text = app.name || name;
  const file = new File([blob], name, { type: "application/x-webxdc" });
  try {
    const pending = webxdc.sendToChat({ file: { name, blob: file }, text });
    if (pending && typeof pending.then === "function") await pending;
  } catch (_) {
    const base64 = await blobToBase64(blob);
    const pending = webxdc.sendToChat({ file: { name, base64 }, text });
    if (pending && typeof pending.then === "function") await pending;
  }
}

async function onDownloadClick(event, app) {
  const webxdc = window.webxdc;
  if (!webxdc || typeof webxdc.sendToChat !== "function") return;
  event.preventDefault();
  const link = event.currentTarget;
  if (!link || link.dataset.sending === "1") return;
  link.dataset.sending = "1";
  const label = link.textContent;
  try {
    await sendXdcToChat(app);
  } catch (error) {
    console.error("webxdc sendToChat failed", error);
    if (link.isConnected) {
      link.textContent = tr("apps_download_failed", "Could not add this app");
      setTimeout(() => {
        if (link.isConnected) link.textContent = label;
      }, 4000);
    }
  } finally {
    if (link) delete link.dataset.sending;
  }
}

/*
<Dialog> creates an overlay that shows the metadata of an app and a button of
downloading the actual webxdc file from the server.
*/
const Dialog = ({app, modal, toggleModal}) => {
  const [subtitle, description] = [app.description.split('\n').shift(), app.description.split('\n').slice(1).join(' ')];
  const xdcUrl = xdcAbsoluteUrl(app.cache_relname);

  // Change the title when a dialog is open
  if(modal === app.app_id) {
    document.title = `webxdc apps: ${app.name}`;
  }

  // Display the size of the webxdc apps in a more human readable format
  let size = `${(app.size/1000).toLocaleString(undefined, {maximumFractionDigits: 1})} kb`;
  if(app.size > 1000000) {
    size = `${(app.size/1000000).toLocaleString(undefined, {maximumFractionDigits: 1})} mb`;
  }

  return html`
    <!-- Only show the modal that matches the app ID that was clicked -->
    <div id=${app.app_id} role="dialog" aria-labelledby="${app.app_id}_label" aria-describedby="${app.app_id}_desc" aria-modal="true" class="${modal === app.app_id ? 'active' : 'hidden'}">
      <div class="app-container">
        <img src="${xdcget_export + "/" + app.icon_relname}" loading="lazy" alt="Icon of ${app.name} app" />
        <div class="metadata">
          <div class="title ellipse">${app.name}</div>
          <div class="description">
            <span class="subtitle" id="${app.app_id}_label">${subtitle}</span>
          </div>
          <div class="author">${extract_author(app.source_code_url)}</div>
        </div>
      </div>
      <div class="description-full" id="${app.app_id}_desc">
        ${description}
      </div>
      <div class="additional-info">
        <div>
          <b>${tr("apps_published", "Published:")} </b>${dayjs(app.date).format("l")} (${app.tag_name})
        </div>
        <div>
          <b>${tr("apps_size", "Size:")} </b>${size}
        </div>
        <div class="ellipse">
          <b>${tr("apps_source", "Source:")} </b><a href=${app.source_code_url} target="_blank" rel="noopener noreferrer">${app.source_code_url}</a>
        </div>
      </div>
      <div class="button-container">
        <a href=${xdcUrl} class="button" onClick=${(event) => onDownloadClick(event, app)}>
          ${tr("apps_download", "Download")}
        </a>
        <button type="button" class="ghost" onClick=${() => toggleModal(false)}>
          ${tr("apps_close", "Close")}
        </button>
      </div>
    </div>
  `;
}

/*
<Search> deals with searching and filtering webxdc apps
*/
const Search = ({apps, setSearchResults, filterGroup}) => {
  const fuse = useMemo(() => {
    return new Fuse(apps, {
      includeScore: true,
      threshold: 0.25,
      // Search in `author` and in `tags` array
      keys: [
        { name: "name", weight: 2 },
        { name: "description", weight: 0.2 },
      ],
    });
  }, [apps]);

  const filterResults = (result) => {
    return filterGroup === "home" ? true : result.item.group === filterGroup;
  } 
  
  const searchFieldRef = useRef(null);
  const updateSearch = useMemo(() => {
    return () => {
      if (searchFieldRef.current) {
        const query = searchFieldRef.current.value;
        if (query) {
          const results = fuse.search(query)
          setSearchResults(results.filter(filterResults));
          // console.log("search result", {results});
          return;
        }
      }
      setSearchResults(
        apps
          .map((app) => ({ item: app }))
          .filter(filterResults)
          .sort(
            (a, b) =>
              new Date(b.item.date).getTime() - new Date(a.item.date).getTime()
          )
      );
    };
  }, [fuse, apps, filterGroup]);

  useEffect(() => {
    // do the initial update or when applist changes
    updateSearch();
    // If the category filter changes, we scroll to the top
    window.scrollTo(0,0);
  }, [apps, filterGroup]);

  return html`
    <div class="search">
      <input
        type="search"
        placeholder=${tr("apps_search_placeholder", "Search apps…")}
        id="search_field"
        ref=${searchFieldRef}
        oninput=${updateSearch}
      />
    </div>
  `;
};

/*
<MainScreen> is responsible for implementing the search function, for fetching
the app data, and for actually rendering the page contents.
*/
const MainScreen = () => {
  /** @typedef {import('./app_list.d').AppList} AppList */
  /** @type {[AppList, (newState: AppList) => void]} */
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, viewModal] = useState(false); 
  const [appIdMap, setIdMap] = useState({});
  const [searchResults, setSearchResults] = useState();
  const [filterGroup, setFilterGroup] = useState("home");

  // Fetch the data that contains all of the apps we have available
  // in the xstore.
  useEffect(() => {
    (async () => {
      console.log("fetch");
      setApps(await (await fetch(xdcget_export + "/xdcget-lock.json")).json());
      setLoading(false);
    })();
  }, []);

  // We need a map so that we can quickly verify later if 
  // an app ID is valid. We'll be using this for verifying
  // valid app ID in window.location.hash
  useEffect(() => {
    setIdMap(apps.reduce((map, app) => {
      map[app.app_id] = true;
      return map;
    }, {}));
  }, [apps]);

  // This allows us to set/unset the modal for a particular app.
  // - Open the modal
  // - Change the hash
  const toggleModal = (appId) => {
    if(appId) {
      viewModal(appId);
      window.location.hash = appId;
    } else {
      viewModal(false);
      document.title = "webxdc apps";
      window.location.hash = 'home';
    }
  };

  const onHashChange = () => {
    // Close any open modals when window.location.hash changes
    // Doesn't matter if it's valid or not.
    viewModal(false);
    if(window.location.hash.substring(1) in appIdMap) {
      toggleModal(window.location.hash.substring(1));
    }
  };

  // We set an event that triggers whenever window.location.hash changes
  useEffect(() => {
    // If the variable s already set, show the modal.
    if (window.location.hash.length > 0) {
      onHashChange();
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);

  }, [window.location.hash, appIdMap]);

  //console.count('render');
  
  return html`
    <${Search} apps=${apps} setSearchResults=${setSearchResults} filterGroup=${filterGroup} />
    <${Categories} apps=${apps} setFilterGroup=${setFilterGroup} filterGroup=${filterGroup} />
    <div id="app_container">
      ${loading && html`<div class="loading">${tr("apps_loading", "Loading…")}</div>`}
      ${searchResults &&
        searchResults.map((result) => html`<${App} app=${result.item} toggleModal=${toggleModal} />`)}
    </div>
    <div id="dialog_layer" class="dialogs">
      <div class="dialog-backdrop ${modal ? 'active' : 'hidden'}">
        ${searchResults && 
          searchResults.map((result) => html`<${Dialog} app=${result.item} modal=${modal} toggleModal=${toggleModal} />`)}
      </div>
    </div>
    <div id="footer">
      <a href="https://support.delta.chat/c/webxdc/20">support forum</a>
      <a href="https://webxdc.org/docs">develop apps</a>
      <a href="https://codeberg.org/webxdc/xdcget/src/branch/main/SUBMIT.md">publish apps</a>
    </div>
  `;
};

const CATEGORIES = [
  { id: "home", icon: "🏠", name: "همه", desc: "همه مینی‌اپ‌های فروشگاه، از تازه‌ترین به قدیمی‌ترین." },
  { id: "crisis", icon: "🛟", name: "بحران و امنیت", desc: "برای قطعی اینترنت، جنگ و بلایا: خبر سلامتی، کمک همسایه‌ها، کوله اضطراری، اسکان موقت و کمک‌های اولیه." },
  { id: "health", icon: "🌿", name: "سلامت و آرامش", desc: "تنفس و آرامش در روزهای سخت، صداهای آرامش‌بخش، ورزش، عادت‌های خوب و مراقبت از نوزاد." },
  { id: "poetry", icon: "📜", name: "شعر، ادبیات و معنویت", desc: "حافظ، سعدی، مولانا، خیام، باباطاهر و شاهنامه به‌صورت آفلاین، مشاعره، فال و اوقات شرعی." },
  { id: "learn", icon: "🎓", name: "آموزش و یادگیری", desc: "کلاس درس داخل چت، جزوه و آزمونک، یادگیری زبان، موسیقی و حل مکعب روبیک." },
  { id: "plan", icon: "🗓️", name: "برنامه‌ریزی و هماهنگی", desc: "تقویم شمسی، قرار گروهی، نظرسنجی، چک‌لیست، لیست خرید، کارهای مشترک و تابلوی اطلاعیه." },
  { id: "biz", icon: "💼", name: "مالی و کسب‌وکار", desc: "دنگ و تقسیم هزینه، صندوق خانوادگی، فروشگاه کوچک، رزرو، حضور و غیاب، انبار و سفارش رستوران." },
  { id: "media", icon: "💬", name: "ارتباط و رسانه", desc: "چت هم‌زمان و رمزنگاری‌شده، ارسال فایل بزرگ، آلبوم عکس، پخش آهنگ و رادیو گروهی." },
  { id: "create", icon: "🎨", name: "نوشتن و طراحی", desc: "وایت‌بورد، نقاشی و پیکسل‌آرت گروهی، ویرایشگر متن و مارک‌داون، ویکی و تخته ایده." },
  { id: "social", icon: "💞", name: "سرگرمی و دورهمی", desc: "برای دوستان، خانواده و زوج‌ها: اسم‌فامیل، بینگو، حیوان خانگی گروهی، کارت تبریک، فهرست آرزو و خاطره." },
  { id: "board", icon: "♟️", name: "بازی فکری و رومیزی", desc: "شطرنج، گو، اتللو، سودوکو، پازل‌ها و بازی‌های استراتژی تک‌نفره یا با اعضای چت." },
  { id: "arcade", icon: "🕹️", name: "بازی اکشن و آرکید", desc: "بازی‌های سریع و سبک برای وقت آزاد: دویدن، پریدن، تیراندازی و رکوردزنی با رقابت گروهی." },
  { id: "dev", icon: "🛠️", name: "ابزار و برنامه‌نویسی", desc: "ماشین‌حساب، صفحه‌گسترده، رمز یک‌بارمصرف، شبیه‌سازها و ابزار ساخت و تست مینی‌اپ." },
];

const Categories = ({apps, setFilterGroup, filterGroup}) => {
  const counts = useMemo(() => {
    const c = { home: apps.length };
    apps.forEach((a) => { c[a.group] = (c[a.group] || 0) + 1; });
    return c;
  }, [apps]);
  const current = CATEGORIES.find((c) => c.id === filterGroup) || CATEGORIES[0];
  return html`<div id="categories" dir="rtl">
    <div class="cat-chips" role="group" aria-label="دسته‌بندی‌ها">
      ${CATEGORIES.filter((c) => c.id === "home" || counts[c.id]).map((c) => html`
        <button type="button" aria-pressed=${filterGroup === c.id ? "true" : "false"}
          class=${"cat-chip" + (filterGroup === c.id ? " active" : "")}
          onClick=${() => setFilterGroup(c.id)}>
          <span class="cat-icon">${c.icon}</span>${c.name}<span class="cat-count">${counts[c.id] || 0}</span>
        </button>`)}
    </div>
    <div class="cat-desc" aria-live="polite"><strong>${current.icon} ${current.name}</strong> — ${current.desc}</div>
  </div>`;
};

// Extract the username from GitHub or Codeberg
const extract_author = (source_code_url) => {
  const matches = /(github.com|codeberg.org)\/([\w\-_]+)/.exec(source_code_url); 
  if(matches && matches.length === 3) {
    return matches[2];
  }
  return "";
};

window.onload = async () => {
  render(html`<${MainScreen} />`, document.getElementById('apps'));
};
