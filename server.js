/**
 * server.js — eLearning / Pre-School Website
 * Node.js + Express + EJS + Multer + Sessions
 *
 * Media sections:
 *   data/images.json  →  { "new-year-celebration": ["/assests/uploads/images/123.jpg", ...], ... }
 *   data/videos.json  →  { "student-reviews": ["/assests/uploads/videos/456-clip.mp4", ...], ... }
 */

require('dotenv').config();

const express     = require('express');
const path        = require('path');
const fs          = require('fs');
const multer      = require('multer');
const session     = require('express-session');
const flash       = require('connect-flash');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const sharp       = require('sharp');          // npm i sharp

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Trust Proxy (Required for secure sessions behind reverse proxies) ────────
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ─── Security Headers ─────────────────────────────────────────────────────────
// NOTE: Helmet adds `script-src-attr 'none'` by default, which blocks inline
// handlers (onclick="..."). Keep it — move handlers into /js/admin-dashboard.js
// and attach them with addEventListener instead of loosening the CSP.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://code.jquery.com", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "*"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.google.com", "https://form.edmissioncrm.com"],
      connectSrc: ["'self'", "https://eflow.kualakubsgurugram.in"],
    },
  },
}));

// ─── Performance / Compression ───────────────────────────────────────────────
app.use(compression());

// ─── Logging ─────────────────────────────────────────────────────────────────
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
app.use(morgan('dev'));
const accessLogStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assests', express.static(path.join(__dirname, 'assests')));
app.use('/lib', express.static(path.join(__dirname, 'lib')));

// ─── Directories ─────────────────────────────────────────────────────────────
const IMAGES_DIR = path.join(__dirname, 'assests', 'uploads', 'images');
const VIDEOS_DIR = path.join(__dirname, 'assests', 'uploads', 'videos');
const DATA_DIR   = path.join(__dirname, 'data');
[IMAGES_DIR, VIDEOS_DIR, DATA_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const IMAGES_JSON = path.join(DATA_DIR, 'images.json');
const VIDEOS_JSON = path.join(DATA_DIR, 'videos.json');

// ─── View Engine ─────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Session ─────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'kualakubs-secret-2026',
  resave: false,
  saveUninitialized: false,
  rolling: true,                       // refresh expiry on every request
  cookie: {
    maxAge: 60 * 60 * 1000,           // 60 minutes auto-logout
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// ─── Flash Messages ───────────────────────────────────────────────────────────
app.use(flash());

// ─── Static Assets ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname), { index: false }));

// ─── Admin Credentials (env or hardcoded fallback) ────────────────────────────
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  req.flash('error', 'Please login to access the admin panel.');
  return res.redirect('/admin/login');
}

// ─── Multer — Image Storage (max 10 MB) ──────────────────────────────────────
// Images are held in memory first so they can be compressed BEFORE touching the disk.
// (Input limit is 10 MB per file; the stored result is ≤ 200 KB.)
const imageStorage = multer.memoryStorage();

const MAX_IMAGE_BYTES = 200 * 1024;     // 200 KB target
const IMAGE_QUALITY   = 80;             // 80 % quality
const SIZE_STEPS      = [1920, 1600, 1280, 1024, 800, 640];   // max widths to try, in order

/**
 * Compress one uploaded image to WebP at quality 80.
 * If the result is still over 200 KB, the image is scaled down step by step
 * (quality stays at 80). Only if even the smallest step is too big does quality drop.
 * Returns the saved filename.
 */
async function compressAndSaveImage(file) {
  const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + '.webp';
  let out;

  for (const width of SIZE_STEPS) {
    out = await sharp(file.buffer, { animated: true })
      .rotate()                                           // respect EXIF orientation
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: IMAGE_QUALITY })
      .toBuffer();
    if (out.length <= MAX_IMAGE_BYTES) break;
  }

  // Last resort for very detailed images: lower the quality
  for (let q = IMAGE_QUALITY - 10; out.length > MAX_IMAGE_BYTES && q >= 40; q -= 10) {
    out = await sharp(file.buffer, { animated: true })
      .rotate()
      .resize({ width: SIZE_STEPS[SIZE_STEPS.length - 1], withoutEnlargement: true })
      .webp({ quality: q })
      .toBuffer();
  }

  await fs.promises.writeFile(path.join(IMAGES_DIR, filename), out);
  return filename;
}

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpg, png, gif, webp).'));
    }
  },
});

// ─── Multer — Video Storage (max 50 MB) ──────────────────────────────────────
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEOS_DIR),
  filename:    (req, file, cb) => {
    const base = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
    const unique = Date.now() + '-' + base;
    cb(null, unique);
  },
});
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /mp4|webm|ogg|mov/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, webm, ogg, mov).'));
    }
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXTS = ['.mp4', '.webm', '.ogg', '.mov'];
const DEFAULT_SECTION = 'uncategorized';

const MEDIA = {
  image: { dir: IMAGES_DIR, json: IMAGES_JSON, exts: IMAGE_EXTS, folder: 'images', hash: 'images' },
  video: { dir: VIDEOS_DIR, json: VIDEOS_JSON, exts: VIDEO_EXTS, folder: 'videos', hash: 'videos' },
};

function readDir(dir, extensions) {
  try {
    return fs.readdirSync(dir)
      .filter(f => extensions.includes(path.extname(f).toLowerCase()))
      .map(f => ({ filename: f, url: '/assests/uploads/' + path.basename(dir) + '/' + f }));
  } catch { return []; }
}

/** "New Year Celebration!" → "new-year-celebration" */
function slugify(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function loadGroups(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  } catch { /* missing or corrupt → start fresh */ }
  return {};
}

/** Atomic write: write temp file then rename, so a crash can't corrupt the JSON. */
function saveGroups(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

/**
 * Load a type's JSON and reconcile it with the files actually on disk:
 *  - paths whose file no longer exists are dropped
 *  - files on disk that aren't in any section go to "uncategorized"
 *    (covers everything uploaded before this feature existed)
 */
function syncGroups(type) {
  const cfg = MEDIA[type];
  const groups = loadGroups(cfg.json);
  const onDisk = readDir(cfg.dir, cfg.exts);
  const urls = new Set(onDisk.map(f => f.url));
  let changed = false;

  Object.keys(groups).forEach(name => {
    if (!Array.isArray(groups[name])) { groups[name] = []; changed = true; return; }
    const kept = groups[name].filter(u => urls.has(u));
    if (kept.length !== groups[name].length) { groups[name] = kept; changed = true; }
  });

  const listed = new Set(Object.values(groups).flat());
  const orphans = onDisk.filter(f => !listed.has(f.url)).map(f => f.url);
  if (orphans.length) {
    groups[DEFAULT_SECTION] = (groups[DEFAULT_SECTION] || []).concat(orphans);
    changed = true;
  }
  if (groups[DEFAULT_SECTION] && groups[DEFAULT_SECTION].length === 0) {
    delete groups[DEFAULT_SECTION];
    changed = true;
  }

  if (changed) saveGroups(cfg.json, groups);
  return groups;
}

/** { section: [urls] } → { section: [{filename, url}] } for the views */
function groupsToObjects(groups) {
  const out = {};
  Object.keys(groups).forEach(name => {
    out[name] = groups[name].map(u => ({ filename: path.basename(u), url: u }));
  });
  return out;
}

/** Resolve the target section from the form: new section name wins over dropdown. */
function resolveSection(body) {
  return slugify(body.new_section) || slugify(body.section);
}

function removeUploaded(files) {
  (files || []).forEach(f => { try { fs.unlinkSync(f.path); } catch { /* ignore */ } });
}

function addToSection(type, section, urls) {
  const cfg = MEDIA[type];
  const groups = syncGroups(type);
  // Newly uploaded files were just placed in "uncategorized" by syncGroups → pull them out
  Object.keys(groups).forEach(name => {
    groups[name] = groups[name].filter(u => !urls.includes(u));
  });
  if (groups[DEFAULT_SECTION] && groups[DEFAULT_SECTION].length === 0 && section !== DEFAULT_SECTION) {
    delete groups[DEFAULT_SECTION];
  }
  groups[section] = (groups[section] || []).concat(urls);
  saveGroups(cfg.json, groups);
}

// ─── Shared Site Data ─────────────────────────────────────────────────────────
const siteData = {
  siteName: 'Kualakubsgurugram',
  tagline:  'The Best Online Learning Platform',
  nav: [
    { label: 'Home',     href: '/' },
    { label: 'About',    href: '/about' },
    { label: 'Courses',  href: '/courses' },
    { label: 'Our Team', href: '/team' },
    { label: 'Testimonial', href: '/testimonial' },
    { label: 'Contact',  href: '/contact' },
  ],
  contact: {
    address: 'Microtek Greenburg Society, Sector 86, Gurugram',
    phone:   '+91-880-010-5105',
    email:   'info@kualakubsgurugram.in',
  },
  social: {
    instagram: 'https://www.instagram.com/p/C-VBXdBP151/?igsh=c2ZvdWRicjJ5aGs4',
    facebook:  'https://www.facebook.com/people/Kualakubs-Gurugram/61555222509045/?mibextid=LQQJ4d',
    whatsapp:  'https://web.whatsapp.com/send?phone=918800105105',
  },
};

// ─── Public View Controllers ──────────────────────────────────────────────────
app.get(['/', '/index.html'], (req, res) => {
  const videoGroups = groupsToObjects(syncGroups('video'));
  const videos = Object.values(videoGroups).flat();   // flat list (backward compatible)
  res.render('index', { ...siteData, currentPath: req.path, pageTitle: 'Home', videos, videoGroups });
});

app.get(['/about', '/about.html'], (req, res) =>
  res.render('about', { ...siteData, currentPath: req.path, pageTitle: 'About Us' }));

app.get(['/courses', '/courses.html'], (req, res) =>
  res.render('courses', { ...siteData, currentPath: req.path, pageTitle: 'Courses' }));

app.get(['/team', '/team.html'], (req, res) =>
  res.render('team', { ...siteData, currentPath: req.path, pageTitle: 'Our Team' }));

app.get(['/testimonial', '/testimonial.html'], (req, res) =>
  res.render('testimonial', { ...siteData, currentPath: req.path, pageTitle: 'Testimonial' }));

app.get(['/contact', '/contact.html'], (req, res) =>
  res.render('contact', { ...siteData, currentPath: req.path, pageTitle: 'Contact Us' }));

app.get(['/privacy-policy', '/privacyPolicy.html'], (req, res) =>
  res.render('privacyPolicy', { ...siteData, currentPath: req.path, pageTitle: 'privacy-policy' }));

app.get(['/terms-conditions', '/termsConditions.html'], (req, res) =>
  res.render('termsConditions', { ...siteData, currentPath: req.path, pageTitle: 'terms-conditions' }));

app.get(['/message-from-the-chairman', '/chairmanMessage.html'], (req, res) =>
  res.render('chairmanMessage', { ...siteData, currentPath: req.path, pageTitle: 'Message from the Chairman' }));

app.get(['/message-from-school-director', '/schoolDirectorMessage.html'], (req, res) =>
  res.render('schoolDirectorMessage', { ...siteData, currentPath: req.path, pageTitle: 'Message from School Director' }));

app.get(['/admission-procedure', '/admissionProcedure.html'], (req, res) =>
  res.render('admissionProcedure', { ...siteData, currentPath: req.path, pageTitle: 'Admission Procedure' }));

app.get(['/documents-required', '/documentsRequired.html'], (req, res) =>
  res.render('documentsRequired', { ...siteData, currentPath: req.path, pageTitle: 'Documents Required' }));

app.get(['/career', '/career.html'], (req, res) =>
  res.render('career', { ...siteData, currentPath: req.path, pageTitle: 'Career' }));

// Gallery — optional filter: /gallery?section=new-year-celebration&page=2
app.get(['/gallery', '/gallery.html'], (req, res) => {
  const groups = groupsToObjects(syncGroups('image'));
  const sections = Object.keys(groups).map(name => ({ name, count: groups[name].length }))
                         .filter(s => s.count > 0);

  const requested = slugify(req.query.section);
  const activeSection = groups[requested] ? requested : '';   // '' = all

  const allImages = activeSection ? groups[activeSection] : Object.values(groups).flat();

  const page = parseInt(req.query.page, 10) || 1;
  const limit = 12;
  const totalImages = allImages.length;
  const totalPages = Math.ceil(totalImages / limit) || 1;
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * limit;
  const images = allImages.slice(startIndex, startIndex + limit);

  res.render('gallery', {
    ...siteData,
    currentPath: req.path,
    pageTitle: 'Gallery',
    images,
    sections,
    activeSection,
    pagination: {
      currentPage,
      totalPages,
      totalImages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    }
  });
});

// ─── Admin — Login ────────────────────────────────────────────────────────────
app.get('/admin/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/login', {
    pageTitle: 'Admin Login',
    siteName:  siteData.siteName,
    error:     req.flash('error'),
    success:   req.flash('success'),
  });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin    = true;
    req.session.loginTime  = new Date().toISOString();
    return res.redirect('/admin');
  }
  req.flash('error', 'Invalid username or password.');
  res.redirect('/admin/login');
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ─── Admin — Dashboard ────────────────────────────────────────────────────────
app.get('/admin', requireAuth, (req, res) => {
  const imageGroups = groupsToObjects(syncGroups('image'));
  const videoGroups = groupsToObjects(syncGroups('video'));
  const images = Object.values(imageGroups).flat();
  const videos = Object.values(videoGroups).flat();

  res.render('admin/dashboard', {
    pageTitle:  'Admin Dashboard',
    siteName:   siteData.siteName,
    images,
    videos,
    imageGroups,                       // { section: [{filename,url}] }
    videoGroups,
    imageSections: Object.keys(imageGroups),   // for the <select>
    videoSections: Object.keys(videoGroups),
    success:    req.flash('success'),
    error:      req.flash('error'),
    loginTime:  req.session.loginTime,
  });
});

// ─── Admin — Create an empty section ──────────────────────────────────────────
app.post('/admin/section/create', requireAuth, (req, res) => {
  const type = req.body.type === 'video' ? 'video' : 'image';
  const cfg  = MEDIA[type];
  const name = slugify(req.body.name);

  if (!name) {
    req.flash('error', 'Please enter a valid section name.');
    return res.redirect('/admin#' + cfg.hash);
  }
  const groups = syncGroups(type);
  if (groups[name]) {
    req.flash('error', `Section "${name}" already exists.`);
  } else {
    groups[name] = [];
    saveGroups(cfg.json, groups);
    req.flash('success', `Section "${name}" created.`);
  }
  res.redirect('/admin#' + cfg.hash);
});

// ─── Admin — Delete a section (files are kept, moved to "uncategorized") ──────
app.post('/admin/section/delete', requireAuth, (req, res) => {
  const type = req.body.type === 'video' ? 'video' : 'image';
  const cfg  = MEDIA[type];
  const name = slugify(req.body.name);
  const groups = syncGroups(type);

  if (!name || !groups[name]) {
    req.flash('error', 'Section not found.');
  } else if (name === DEFAULT_SECTION) {
    req.flash('error', 'The "uncategorized" section cannot be deleted.');
  } else {
    const moved = groups[name];
    delete groups[name];
    if (moved.length) groups[DEFAULT_SECTION] = (groups[DEFAULT_SECTION] || []).concat(moved);
    saveGroups(cfg.json, groups);
    req.flash('success', `Section "${name}" deleted. ${moved.length} file(s) moved to "${DEFAULT_SECTION}".`);
  }
  res.redirect('/admin#' + cfg.hash);
});

// ─── Admin — Upload Image (multi-upload up to 20, into a section) ─────────────
app.post('/admin/upload/image', requireAuth, (req, res) => {
  uploadImage.array('images', 20)(req, res, async (err) => {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('/admin#images');
    }
    if (!req.files || req.files.length === 0) {
      req.flash('error', 'No files selected.');
      return res.redirect('/admin#images');
    }
    // Validate the section first — files are only in memory, so nothing to clean up on failure
    const section = resolveSection(req.body);
    if (!section) {
      req.flash('error', 'Please choose a section or create a new one.');
      return res.redirect('/admin#images');
    }

    const urls = [];
    let failed = 0;
    for (const file of req.files) {          // sequential: keeps memory/CPU use predictable
      try {
        const name = await compressAndSaveImage(file);
        urls.push('/assests/uploads/images/' + name);
      } catch (e) {
        console.error('Image compression failed:', file.originalname, e.message);
        failed++;
      }
    }

    if (urls.length) addToSection('image', section, urls);

    if (failed && !urls.length) {
      req.flash('error', 'Could not process the selected image(s). Please try different files.');
    } else if (failed) {
      req.flash('error', `${urls.length} image(s) uploaded to "${section}", ${failed} could not be processed.`);
    } else {
      req.flash('success', `${urls.length} image(s) compressed and uploaded to "${section}".`);
    }
    res.redirect('/admin#images');
  });
});

// ─── Admin — Upload Video (into a section) ────────────────────────────────────
app.post('/admin/upload/video', requireAuth, (req, res) => {
  uploadVideo.single('video')(req, res, (err) => {
    if (err) {
      if (req.file) removeUploaded([req.file]);
      req.flash('error', err.message);
      return res.redirect('/admin#videos');
    }
    if (!req.file) {
      req.flash('error', 'No file selected.');
      return res.redirect('/admin#videos');
    }
    const section = resolveSection(req.body);
    if (!section) {
      removeUploaded([req.file]);
      req.flash('error', 'Please choose a section or create a new one.');
      return res.redirect('/admin#videos');
    }
    addToSection('video', section, ['/assests/uploads/videos/' + req.file.filename]);
    req.flash('success', `Video "${req.file.originalname}" uploaded to "${section}".`);
    res.redirect('/admin#videos');
  });
});

// ─── Admin — Move files to another section ────────────────────────────────────
app.post('/admin/move', requireAuth, (req, res) => {
  const type = req.body.type === 'video' ? 'video' : 'image';
  const cfg  = MEDIA[type];
  const target = resolveSection({ new_section: req.body.new_section, section: req.body.target });
  const raw = req.body.files;
  const names = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(n => path.basename(n));

  if (!target || names.length === 0) {
    req.flash('error', 'Select files and a target section.');
    return res.redirect('/admin#' + cfg.hash);
  }
  const urls = names.map(n => '/assests/uploads/' + cfg.folder + '/' + n);
  addToSection(type, target, urls);
  req.flash('success', `${urls.length} file(s) moved to "${target}".`);
  res.redirect('/admin#' + cfg.hash);
});

// ─── Admin — Delete Files (multi-select) ──────────────────────────────────────
app.post('/admin/delete', requireAuth, (req, res) => {
  const type = req.body.type === 'image' ? 'image' : req.body.type === 'video' ? 'video' : null;
  if (!type) {
    req.flash('error', 'Invalid media type.');
    return res.redirect('/admin');
  }
  const cfg   = MEDIA[type];
  const raw   = req.body.files;
  const names = (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
  let deleted = 0;
  let errors  = 0;

  names.forEach(name => {
    const safe = path.basename(name);          // strip path traversal
    const full = path.join(cfg.dir, safe);
    try {
      if (fs.existsSync(full)) { fs.unlinkSync(full); deleted++; }
    } catch { errors++; }
  });

  syncGroups(type);                            // drops deleted paths from the JSON

  if (errors) {
    req.flash('error', `Deleted ${deleted} file(s). ${errors} could not be deleted.`);
  } else {
    req.flash('success', `${deleted} file(s) deleted successfully.`);
  }
  res.redirect('/admin#' + cfg.hash);
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).render('404', { ...siteData, pageTitle: '404 – Page Not Found', currentPath: req.path }));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Server running → http://localhost:${PORT}`);
  console.log(`🔑  Admin panel   → http://localhost:${PORT}/admin`);
  console.log(`👤  Credentials   → ${ADMIN_USER} / ${ADMIN_PASS}\n`);
});
