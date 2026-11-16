const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const SOP_ROOT = process.env.SOP_STORAGE_DIR
  ? path.resolve(process.env.SOP_STORAGE_DIR)
  : path.join(__dirname, '..', '..', '..', 'storage', 'sop');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const id = path.basename(String(req.params.id || '').trim());
    if (!id) return cb(new Error('Missing project id'));

    const dir = path.join(SOP_ROOT, id);
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename: (req, file, cb) => {
    cb(null, path.basename(file.originalname));
  },
});

const upload = multer({ storage });

// Save uploaded SOP files under <SOP_ROOT>/<projectId>/
router.post('/sop/upload/:id', upload.array('files'), (req, res) => {
  res.json({ ok: true, files: (req.files || []).map((f) => f.filename) });
});

// List the files uploaded for a project
router.get('/sop/files/:id', (req, res) => {
  const id = path.basename(String(req.params.id || '').trim());
  const dir = path.join(SOP_ROOT, id);

  fs.readdir(dir, (err, files) => {
    if (err) {
      if (err.code === 'ENOENT') return res.json([]);
      return res.status(500).json({ error: 'Failed to list files', details: err.message });
    }
    res.json(files);
  });
});

// Download a file
router.get('/sop/download/:id/:filename', (req, res) => {
  const id = path.basename(String(req.params.id || '').trim());
  const filename = path.basename(String(req.params.filename || '').trim());
  const filePath = path.join(SOP_ROOT, id, filename);

  res.download(filePath, filename, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'File not found' });
    }
  });
});

// Delete a file
router.delete('/sop/files/:id/:filename', (req, res) => {
  const id = path.basename(String(req.params.id || '').trim());
  const filename = path.basename(String(req.params.filename || '').trim());
  const filePath = path.join(SOP_ROOT, id, filename);

  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to delete file', details: err.message });
    res.json({ ok: true });
  });
});

module.exports = router;
