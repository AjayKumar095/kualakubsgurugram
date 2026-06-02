/**
 * server.js — eLearning / Pre-School Website
 * Node.js + Express + EJS + Multer + Sessions
 */

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');
const session    = require('express-session');
const flash      = require('connect-flash');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
// app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/lib', express.static(path.join(__dirname, 'lib')));

// ─── Directories ─────────────────────────────────────────────────────────────
const IMAGES_DIR = path.join(__dirname, 'assests', 'uploads', 'images');
const VIDEOS_DIR = path.join(__dirname, 'assests', 'uploads', 'videos');
[IMAGES_DIR, VIDEOS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

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
    maxAge: 60 * 60 * 1000,           // 30 minutes auto-logout
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// ─── Flash Messages ───────────────────────────────────────────────────────────
app.use(flash());

// ─── Static Assets ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname), { index: false }));
app.use('/assests', express.static(path.join(__dirname, 'assests')));

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
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGES_DIR),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  },
});
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
function readDir(dir, extensions) {
  try {
    return fs.readdirSync(dir)
      .filter(f => extensions.includes(path.extname(f).toLowerCase()))
      .map(f => ({ filename: f, url: '/assests/uploads/' + path.basename(dir) + '/' + f }));
  } catch { return []; }
}

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXTS = ['.mp4', '.webm', '.ogg', '.mov'];

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
  const videos = readDir(VIDEOS_DIR, VIDEO_EXTS);
  res.render('index', { ...siteData, currentPath: req.path, pageTitle: 'Home', videos });
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

app.get(['/gallery', '/gallery.html'], (req, res) => {
  const allImages = readDir(IMAGES_DIR, IMAGE_EXTS);
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
  const images = readDir(IMAGES_DIR, IMAGE_EXTS);
  const videos = readDir(VIDEOS_DIR, VIDEO_EXTS);
  res.render('admin/dashboard', {
    pageTitle:  'Admin Dashboard',
    siteName:   siteData.siteName,
    images,
    videos,
    success:    req.flash('success'),
    error:      req.flash('error'),
    loginTime:  req.session.loginTime,
  });
});

// ─── Admin — Upload Image (multi-upload up to 20) ───────────────────────────────
app.post('/admin/upload/image', requireAuth, (req, res) => {
  uploadImage.array('images', 20)(req, res, (err) => {
    if (err) {
      req.flash('error', err.message);
    } else if (!req.files || req.files.length === 0) {
      req.flash('error', 'No files selected.');
    } else {
      req.flash('success', `${req.files.length} image(s) uploaded successfully.`);
    }
    res.redirect('/admin#images');
  });
});

// ─── Admin — Upload Video ──────────────────────────────────────────────────────
app.post('/admin/upload/video', requireAuth, (req, res) => {
  uploadVideo.single('video')(req, res, (err) => {
    if (err) {
      req.flash('error', err.message);
    } else if (!req.file) {
      req.flash('error', 'No file selected.');
    } else {
      req.flash('success', `Video "${req.file.originalname}" uploaded successfully.`);
    }
    res.redirect('/admin#videos');
  });
});

// ─── Admin — Delete Files (multi-select) ──────────────────────────────────────
app.post('/admin/delete', requireAuth, (req, res) => {
  const { type, files } = req.body;
  const dir    = type === 'image' ? IMAGES_DIR : VIDEOS_DIR;
  const names  = Array.isArray(files) ? files : [files];
  let deleted  = 0;
  let errors   = 0;

  names.forEach(name => {
    // Sanitise: strip path traversal
    const safe = path.basename(name);
    const full = path.join(dir, safe);
    try {
      if (fs.existsSync(full)) { fs.unlinkSync(full); deleted++; }
    } catch { errors++; }
  });

  if (errors) {
    req.flash('error', `Deleted ${deleted} file(s). ${errors} could not be deleted.`);
  } else {
    req.flash('success', `${deleted} file(s) deleted successfully.`);
  }
  res.redirect('/admin#' + (type === 'image' ? 'images' : 'videos'));
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
