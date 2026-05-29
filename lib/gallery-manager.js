/**
 * lib/gallery-manager.js
 * Manages gallery folders and images (CRUD operations)
 */

const fs = require('fs');
const path = require('path');

const GALLERIES_FILE = path.join(__dirname, '../data/galleries.json');
const IMAGES_FILE = path.join(__dirname, '../data/images.json');

// Initialize data files if they don't exist
const ensureDataFiles = () => {
  if (!fs.existsSync(GALLERIES_FILE)) {
    fs.writeFileSync(GALLERIES_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(IMAGES_FILE)) {
    fs.writeFileSync(IMAGES_FILE, JSON.stringify([], null, 2));
  }
};

// ─── Gallery Folder Operations ───────────────────────────────────────────────

const getAllGalleries = () => {
  ensureDataFiles();
  const data = fs.readFileSync(GALLERIES_FILE, 'utf8');
  return JSON.parse(data);
};

const getGalleryBySlug = (slug) => {
  const galleries = getAllGalleries();
  return galleries.find(g => g.slug === slug);
};

const createGallery = (title, slug, thumbnailPath, description = '') => {
  const galleries = getAllGalleries();
  
  // Check if slug already exists
  if (galleries.some(g => g.slug === slug)) {
    throw new Error('Slug already exists');
  }

  const newGallery = {
    id: `gallery-${Date.now()}`,
    title,
    slug,
    thumbnail: thumbnailPath,
    description,
    createdAt: new Date().toISOString(),
  };

  galleries.push(newGallery);
  fs.writeFileSync(GALLERIES_FILE, JSON.stringify(galleries, null, 2));
  return newGallery;
};

const updateGallery = (slug, updates) => {
  const galleries = getAllGalleries();
  const index = galleries.findIndex(g => g.slug === slug);
  
  if (index === -1) {
    throw new Error('Gallery not found');
  }

  galleries[index] = { ...galleries[index], ...updates, updatedAt: new Date().toISOString() };
  fs.writeFileSync(GALLERIES_FILE, JSON.stringify(galleries, null, 2));
  return galleries[index];
};

const deleteGallery = (slug) => {
  const galleries = getAllGalleries();
  const filtered = galleries.filter(g => g.slug !== slug);
  
  if (filtered.length === galleries.length) {
    throw new Error('Gallery not found');
  }

  fs.writeFileSync(GALLERIES_FILE, JSON.stringify(filtered, null, 2));
  
  // Also delete all images in this gallery
  deleteImagesByGallerySlug(slug);
};

// ─── Image Operations ────────────────────────────────────────────────────────

const getAllImages = () => {
  ensureDataFiles();
  const data = fs.readFileSync(IMAGES_FILE, 'utf8');
  return JSON.parse(data);
};

const getImagesByGallerySlug = (gallerySlug) => {
  const images = getAllImages();
  return images.filter(img => img.gallerySlug === gallerySlug);
};

const addImages = (gallerySlug, imageArray) => {
  // imageArray = [ { filename, title, slug }, ... ]
  const images = getAllImages();

  const newImages = imageArray.map((img, idx) => ({
    id: `image-${Date.now()}-${idx}`,
    gallerySlug,
    title: img.title || 'Untitled',
    image: `/assests/upload/images/${img.filename}`,
    slug: img.slug || `image-${Date.now()}-${idx}`,
    createdAt: new Date().toISOString(),
  }));

  images.push(...newImages);
  fs.writeFileSync(IMAGES_FILE, JSON.stringify(images, null, 2));
  return newImages;
};

const deleteImagesByGallerySlug = (gallerySlug) => {
  const images = getAllImages();
  const imagesToDelete = images.filter(img => img.gallerySlug === gallerySlug);
  
  // Delete physical files
  imagesToDelete.forEach(img => {
    const filePath = path.join(__dirname, '../', img.image);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  const filtered = images.filter(img => img.gallerySlug !== gallerySlug);
  fs.writeFileSync(IMAGES_FILE, JSON.stringify(filtered, null, 2));
};

const deleteImage = (imageId) => {
  const images = getAllImages();
  const imageToDelete = images.find(img => img.id === imageId);
  
  if (!imageToDelete) {
    throw new Error('Image not found');
  }

  // Delete physical file
  const filePath = path.join(__dirname, '../', imageToDelete.image);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const filtered = images.filter(img => img.id !== imageId);
  fs.writeFileSync(IMAGES_FILE, JSON.stringify(filtered, null, 2));
};

module.exports = {
  getAllGalleries,
  getGalleryBySlug,
  createGallery,
  updateGallery,
  deleteGallery,
  getAllImages,
  getImagesByGallerySlug,
  addImages,
  deleteImage,
  deleteImagesByGallerySlug,
};
