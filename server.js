/**
 * server.js — eLearning / Pre-School Website
 * Node.js + Express + EJS
 */

const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer'); 
app.use('/img', express.static(path.join(__dirname, 'img')));

const app = express();
const PORT = process.env.PORT || 3000;


// ─── Imports ────────────────────────────────────────────────────────────────
const galleryManager = require('./lib/gallery-manager');
const { isAuthenticated, isNotAuthenticated } = require('./middleware/auth-middleware');

// ─── Configuration ──────────────────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Change in production!

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'assests/uploads/images'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadThumbnail = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'assests/uploads/thumbnails'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images allowed.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

const uploadThumb = multer({
  storage: uploadThumbnail,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images allowed.'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// ─── Session Middleware ─────────────────────────────────────────────────────
app.use(session({
  secret: 'gallery-admin-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// ─── Body Parser Middleware ─────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// ─── View Engine ────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Routing Strategy Updated ───────────────────────────────────────────────
// We no longer use 301 redirects for .html files.
// Instead, both clean and .html URLs are routed directly to View Functions.

// ─── Static assests ──────────────────────────────────────────────────────────
// index:false prevents Express auto-serving index.html at /
// (our EJS route for '/' handles that instead).
app.use(express.static(path.join(__dirname), { index: false }));

// ─── Shared Template Data ───────────────────────────────────────────────────
const siteData = {
  siteName: 'Kualakubsgurugram',
  tagline: 'The Best Online Learning Platform',
  nav: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Courses', href: '/courses' },
    { label: 'Our Team', href: '/team' },
    { label: 'Testimonial', href: '/testimonial' },
    { label: 'Contact', href: '/contact' },
   
  ],
  contact: {
    address: 'Microtek Greenburg Society, Sector 86, Gurugram',
    phone: '+91-880-010-5105',
    email: 'info@kualakubsgurugram.in',
  },
  social: {
    instagram: 'https://www.instagram.com/p/C-VBXdBP151/?igsh=c2ZvdWRicjJ5aGs4',
    facebook: 'https://www.facebook.com/people/Kualakubs-Gurugram/61555222509045/?mibextid=LQQJ4d',
    whatsapp: 'https://web.whatsapp.com/send?phone=918800105105',
  },
};

// ─── View Functions (Controllers) ───────────────────────────────────────────

const renderHome = (req, res) => {
  res.render('index', { ...siteData, currentPath: req.path, pageTitle: 'Home' });
};

const renderAbout = (req, res) => {
  res.render('about', { ...siteData, currentPath: req.path, pageTitle: 'About Us' });
};

const renderCourses = (req, res) => {
  res.render('courses', { ...siteData, currentPath: req.path, pageTitle: 'Courses' });
};

const renderTeam = (req, res) => {
  res.render('team', { ...siteData, currentPath: req.path, pageTitle: 'Our Team' });
};

const renderTestimonial = (req, res) => {
  res.render('testimonial', { ...siteData, currentPath: req.path, pageTitle: 'Testimonial' });
};

const renderContact = (req, res) => {
  res.render('contact', { ...siteData, currentPath: req.path, pageTitle: 'Contact Us' });
};

const renderChairmanMessage = (req, res) => {
  res.render('chairmanMessage', { ...siteData, currentPath: req.path, pageTitle: 'Message-from-the-chairman' });
};

const renderDirectorMessage = (req, res) => {
  res.render('schoolDirectorMessage', { ...siteData, currentPath: req.path, pageTitle: 'Message from school director' });
};

const renderadmissionProcedure = (req, res) => {
  res.render('admissionProcedure', { ...siteData, currentPath: req.path, pageTitle: 'Admission Procedure' });
};

const renderdocumentsRequired = (req, res) => {
  res.render('documentsRequired', { ...siteData, currentPath: req.path, pageTitle: 'Documents Required' });
};

const renderCareer = (req, res) => {
  res.render('career', { ...siteData, currentPath: req.path, pageTitle: 'Career' });
};

const renderGallery = (req, res) => {
  res.render('gallery', { ...siteData, currentPath: req.path, pageTitle: 'gallery' });
};

const renderprivacyPolicy = (req, res) => {
  res.render('privacyPolicy', { ...siteData, currentPath: req.path, pageTitle: 'Privacy & Policy' });
};

const rendertermsConditions = (req, res) => {
  res.render('termsConditions', { ...siteData, currentPath: req.path, pageTitle: 'Terms & Conditions' });
};


// ─── Admin Routes ───────────────────────────────────────────────────────────

const renderAdminLogin = (req, res) => {
  res.render('admin-login', {...siteData, currentPath: req.path,  error: null });
};

const handleAdminLogin = (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.render('admin-login', { error: 'Password is required' });
  }

  if (password === ADMIN_PASSWORD) {
    req.session.adminAuthenticated = true;
    res.redirect('/admin');
  } else {
    res.render('admin-login', { error: 'Invalid password' });
  }
};

const handleAdminLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Session destroy error:', err);
    res.redirect('/admin/login');
  });
};

const renderAdminDashboard = (req, res) => {
  const galleries = galleryManager.getAllGalleries();
  res.render('admin-dashboard', { galleries, currentPath: req.path, error: null, success: null });
};
// const renderAdminDashboard = (req, res) => {
//   const galleries = galleryManager.getAllGalleries();

//   res.render('admin-dashboard', {
//     ...siteData,
//     galleries,
//     currentPath: req.path,
//     pageTitle: 'Admin Dashboard',
//     error: null,
//     success: null
//   });
// };
const handleCreateGallery = (req, res) => {
  try {
    const { title, slug, description } = req.body;
    
    if (!title || !slug) {
      return res.render('admin-dashboard', {
        galleries: galleryManager.getAllGalleries(),
        currentPath: req.path,
        error: 'Title and slug are required',
        success: null
      });
    }

    const thumbnailPath = req.file ? `/assests/uploads/thumbnails/${req.file.filename}` : 'img/KUALAKUBS-LOGO-1.png';
    
    galleryManager.createGallery(title, slug, thumbnailPath, description);
    
    res.render('admin-dashboard', {
      galleries: galleryManager.getAllGalleries(),
      currentPath: req.path,
      error: null,
      success: 'Gallery folder created successfully!'
    });
  } catch (err) {
    res.render('admin-dashboard', {
      galleries: galleryManager.getAllGalleries(),
      currentPath: req.path,
      error: err.message,
      success: null
    });
  }
};

const handleUploadImages = (req, res) => {
  try {
    const { gallerySlug, imageDetails } = req.body;

    if (!gallerySlug) {
      return res.render('admin-dashboard', {
        galleries: galleryManager.getAllGalleries(),
        currentPath: req.path,
        error: 'Gallery folder not selected',
        success: null
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.render('admin-dashboard', {
        galleries: galleryManager.getAllGalleries(),
        currentPath: req.path,
        error: 'No images selected',
        success: null
      });
    }

    const imageArray = req.files.map((file, idx) => ({
      filename: file.filename,
      title: imageDetails && imageDetails[idx] && imageDetails[idx].title ? imageDetails[idx].title : file.originalname,
      slug: imageDetails && imageDetails[idx] && imageDetails[idx].slug ? imageDetails[idx].slug : `img-${Date.now()}-${idx}`
    }));

    galleryManager.addImages(gallerySlug, imageArray);

    res.render('admin-dashboard', {
      galleries: galleryManager.getAllGalleries(),
      currentPath: req.path,
      error: null,
      success: `${req.files.length} image(s) uploaded successfully!`
    });
  } catch (err) {
    res.render('admin-dashboard', {
      galleries: galleryManager.getAllGalleries(),
      currentPath: req.path,
      error: err.message,
      success: null
    });
  }
};

const renderGalleryCategory = (req, res) => {
  const { slug } = req.params;
  const gallery = galleryManager.getGalleryBySlug(slug);

  if (!gallery) {
    return res.status(404).render('404', { ...siteData, pageTitle: '404 – Gallery Not Found', currentPath: req.path });
  }

  const images = galleryManager.getImagesByGallerySlug(slug);
  res.render('gallery-category', {
    ...siteData,
    currentPath: req.path,
    pageTitle: gallery.title,
    gallery,
    images
  });
};


// ─── Routes ─────────────────────────────────────────────────────────────────
app.get(['/', '/index.html'], renderHome);
app.get(['/about', '/about.html'], renderAbout);
app.get(['/courses', '/courses.html'], renderCourses);
app.get(['/team', '/team.html'], renderTeam);
app.get(['/testimonial', '/testimonial.html'], renderTestimonial);
app.get(['/contact', '/contact.html'], renderContact);
app.get(['/message-from-the-chairman', '/chairmanMessage.html'], renderChairmanMessage);
app.get(['/message-from-school-director', '/schoolDirectorMessage.html'], renderDirectorMessage);
app.get(['/admission-procedure', '/admissionProcedure.html'], renderadmissionProcedure);
app.get(['/documents-required', '/documentsRequired.html'], renderdocumentsRequired);
app.get(['/career', '/career.html'], renderCareer);
app.get(['/gallery', '/gallery.html'], renderGallery);
app.get(['/privacy-policy', '/privacyPolicy.html'], renderprivacyPolicy);
app.get(['/terms-conditions', '/termsConditions.html'], rendertermsConditions);

// ─── Admin Routes ───────────────────────────────────────────────────────────
app.get('/admin/login', isNotAuthenticated, renderAdminLogin);
app.post('/admin/login', isNotAuthenticated, handleAdminLogin);
app.get('/admin', isAuthenticated, renderAdminDashboard);
app.post('/admin/create-gallery', isAuthenticated, uploadThumb.single('thumbnail'), handleCreateGallery);
app.post('/admin/upload-images', isAuthenticated, upload.array('images', 50), handleUploadImages);
app.get('/admin/logout', handleAdminLogout);

// 404 catch-all
app.use((req, res) => {
  res.status(404).render('404', { ...siteData, pageTitle: '404 – Page Not Found', currentPath: req.path });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Server running → http://localhost:${PORT}\n`);
});
