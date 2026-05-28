/**
 * server.js — eLearning / Pre-School Website
 * Node.js + Express + EJS
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── View Engine ────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Routing Strategy Updated ───────────────────────────────────────────────
// We no longer use 301 redirects for .html files.
// Instead, both clean and .html URLs are routed directly to View Functions.

// ─── Static Assets ──────────────────────────────────────────────────────────
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

// 404 catch-all
app.use((req, res) => {
  res.status(404).render('404', { ...siteData, pageTitle: '404 – Page Not Found', currentPath: req.path });
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Server running → http://localhost:${PORT}\n`);
});
