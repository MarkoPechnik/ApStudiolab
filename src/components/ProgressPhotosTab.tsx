import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2, Layout, Check, AlertCircle, Plus, RefreshCw, Upload, Grid, List, CheckCircle2, ChevronRight } from 'lucide-react';
import { Artwork, ProgressPhoto, User } from '../types';
import { storageService } from '../services/storage';

interface ProgressPhotosTabProps {
  classId: string;
  studentUid: string;
  artworks: Artwork[];
  progressPhotos: ProgressPhoto[];
  onPhotosUpdated: (photos: ProgressPhoto[]) => void;
  onArtworkAddedFromComposite: (newArt: Artwork) => void;
  isEditable: boolean;
  currentUser: User | null;
}

type TemplateType = 'grid' | 'horizontal' | 'vertical' | 'split';

export function ProgressPhotosTab({
  classId,
  studentUid,
  artworks,
  progressPhotos,
  onPhotosUpdated,
  onArtworkAddedFromComposite,
  isEditable,
  currentUser
}: ProgressPhotosTabProps) {
  // Current active workspace
  const [activeWorkspace, setActiveWorkspace] = useState<'log' | 'collage'>('log');
  
  // Filtering & Search
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [density, setDensity] = useState<'dense' | 'spacious'>('spacious');
  
  // Upload States (SI selection is structurally required before camera access)
  const [selectedSiRow, setSelectedSiRow] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  
  // Collage Canvas Selection Repository
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('grid');

  // Interactive composite form details for final publication
  const [compositeTitle, setCompositeTitle] = useState('');
  const [compositeMaterials, setCompositeMaterials] = useState('');
  const [compositeProcess, setCompositeProcess] = useState('');
  const [compositeDimensions, setCompositeDimensions] = useState('12" x 9"');
  const [compositeIdeas, setCompositeIdeas] = useState('');
  const [isSubmittingComposite, setIsSubmittingComposite] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Hidden inputs for Camera/Library actions
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);

  // Pre-generate standard 15 Sustained investigations list
  const siOptions = Array.from({ length: 15 }, (_, i) => `SI${i + 1}`);

  // Redraw canvas if template or selection modifications occur
  useEffect(() => {
    if (activeWorkspace === 'collage' && selectedPhotoIds.length >= 3 && selectedPhotoIds.length <= 4) {
      // Small timeout to allow canvas element render lifecycle to resolve
      const t = setTimeout(() => {
        drawComposite();
      }, 60);
      return () => clearTimeout(t);
    }
  }, [selectedPhotoIds, selectedTemplate, progressPhotos, activeWorkspace]);

  // Autocomplete metadata suggestions for the template composite
  useEffect(() => {
    if (selectedPhotoIds.length >= 3) {
      const selected = progressPhotos.filter(p => selectedPhotoIds.includes(p.id));
      const linkedSiRows = Array.from(new Set(selected.map(p => p.siArtworkId)));
      const rowsJoined = linkedSiRows.length > 0 ? linkedSiRows.join(', ') : 'SI Pieces';

      setCompositeTitle(`Process & Revision Sequence (${rowsJoined})`);
      setCompositeMaterials("Sequential photographic process composite document");
      setCompositeProcess(`This composite showcases consecutive stages of my sustained investigation. It serves as direct evidence of ongoing practice, material experimentation, and structural revision as guided by our inquiry topic.`);
      setCompositeIdeas(`To document key visual transition stages and structural modifications made during the developmental process of ${rowsJoined}.`);
    }
  }, [selectedPhotoIds]);

  // Main Image Upload Base64 Processor
  const processImageFile = async (file: File) => {
    if (!selectedSiRow) {
      alert("Please select which Sustained Investigation (SI1 to SI15) you are adding photos to first.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert("Asset file exceeds the 8MB limit. Please upload or capture a smaller image.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawBase64 = event.target?.result as string;
      
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to standard compressed JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        
        const newPhoto: ProgressPhoto = {
          id: Math.random().toString(36).substr(2, 9),
          imageUrl: compressedBase64,
          uploadedAt: Date.now(),
          siArtworkId: selectedSiRow,
          ...(caption.trim() ? { caption: caption.trim() } : {})
        };

        const updated = [newPhoto, ...progressPhotos];
        onPhotosUpdated(updated);
        try {
          await storageService.saveProgressPhotos(classId, studentUid, [newPhoto]);
        } catch (err: any) {
          console.error("Failed to save progress photo:", err);
          alert("Could not upload progress photo. This might happen if the resized file is still too large.");
        }
        
        setCaption('');
        setUploading(false);
      };
      
      img.onerror = () => {
        setUploading(false);
        alert("Failed to load image for compression.");
      };
      
      img.src = rawBase64;
    };
    reader.onerror = () => {
      setUploading(false);
      alert("An error occurred while reading the image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleLibraryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };



  const handleDeletePhoto = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this progress snapshot?")) return;
    
    const originalPhotos = [...progressPhotos];
    const updated = progressPhotos.filter(p => p.id !== id);
    onPhotosUpdated(updated);
    setSelectedPhotoIds(prev => prev.filter(x => x !== id));
    
    try {
      await storageService.deleteProgressPhoto(classId, studentUid, id);
    } catch (err) {
      console.error("Failed to delete progress photo:", err);
      alert("Could not delete the progress photo. Please try again.");
      // Rollback state if storage operation fails
      onPhotosUpdated(originalPhotos);
    }
  };

  const handleUpdateAssociation = async (photoId: string, siRow: string) => {
    const updated = progressPhotos.map(p => {
      if (p.id === photoId) return { ...p, siArtworkId: siRow };
      return p;
    });
    onPhotosUpdated(updated);
    
    const target = updated.find(p => p.id === photoId);
    if (target) {
      await storageService.saveProgressPhotos(classId, studentUid, [target]);
    }
  };

  const handleToggleSelectForComposite = (id: string) => {
    if (selectedPhotoIds.includes(id)) {
      setSelectedPhotoIds(prev => prev.filter(x => x !== id));
    } else {
      if (selectedPhotoIds.length >= 4) {
        alert("Maximum Selection: Choose up to 4 progress photos for creating your layout composite.");
        return;
      }
      setSelectedPhotoIds(prev => [...prev, id]);
    }
  };

  // HTML5 Image crop / aspect-ratio filling
  const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
    const imgRatio = img.width / img.height;
    const targetRatio = w / h;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    
    if (imgRatio > targetRatio) {
      sw = img.height * targetRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / targetRatio;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  const drawComposite = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CW = 1200;
    const CH = 900;
    canvas.width = CW;
    canvas.height = CH;

    // Clean white canvas foundation
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CW, CH);

    const activeSelected = progressPhotos.filter(p => selectedPhotoIds.includes(p.id));
    const imageLoadPromises = activeSelected.map(p => {
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = p.imageUrl;
        img.onload = () => resolve(img);
        img.onerror = () => {
          const fallback = new Image();
          resolve(fallback);
        };
      });
    });

    const loadedImages = await Promise.all(imageLoadPromises);
    if (!ctx) return;

    // Grid spacing border definition
    const gap = 16;
    ctx.fillStyle = '#FFFFFF';

    if (selectedTemplate === 'grid') {
      const colWidth = (CW - gap * 3) / 2;
      const rowHeight = (CH - gap * 3) / 2;
      const positions = [
        { x: gap, y: gap },
        { x: gap * 2 + colWidth, y: gap },
        { x: gap, y: gap * 2 + rowHeight },
        { x: gap * 2 + colWidth, y: gap * 2 + rowHeight }
      ];

      for (let i = 0; i < 4; i++) {
        const pos = positions[i];
        ctx.fillStyle = '#F4F4F5';
        ctx.fillRect(pos.x, pos.y, colWidth, rowHeight);
        
        if (loadedImages[i]) {
          drawImageCover(ctx, loadedImages[i], pos.x, pos.y, colWidth, rowHeight);
        }
      }
    } else if (selectedTemplate === 'horizontal') {
      const count = Math.max(1, loadedImages.length);
      const colWidth = (CW - gap * (count + 1)) / count;
      const rowHeight = CH - gap * 2;

      for (let i = 0; i < count; i++) {
        const xPos = gap + i * (colWidth + gap);
        ctx.fillStyle = '#F4F4F5';
        ctx.fillRect(xPos, gap, colWidth, rowHeight);
        
        if (loadedImages[i]) {
          drawImageCover(ctx, loadedImages[i], xPos, gap, colWidth, rowHeight);
        }
      }
    } else if (selectedTemplate === 'vertical') {
      const count = Math.max(1, loadedImages.length);
      const colHeight = (CH - gap * (count + 1)) / count;
      const colWidth = CW - gap * 2;

      for (let i = 0; i < count; i++) {
        const yPos = gap + i * (colHeight + gap);
        ctx.fillStyle = '#F4F4F5';
        ctx.fillRect(gap, yPos, colWidth, colHeight);
        
        if (loadedImages[i]) {
          drawImageCover(ctx, loadedImages[i], gap, yPos, colWidth, colHeight);
        }
      }
    } else if (selectedTemplate === 'split') {
      const leftWidth = (CW - gap * 3) * 0.65;
      const rightWidth = (CW - gap * 3) * 0.35;
      const mainHeight = CH - gap * 2;

      ctx.fillStyle = '#F4F4F5';
      ctx.fillRect(gap, gap, leftWidth, mainHeight);
      if (loadedImages[0]) {
        drawImageCover(ctx, loadedImages[0], gap, gap, leftWidth, mainHeight);
      }

      const remCount = Math.max(1, loadedImages.length - 1);
      const subHeight = (mainHeight - gap * (remCount - 1)) / remCount;
      const rightX = gap * 2 + leftWidth;

      for (let i = 0; i < remCount; i++) {
        const subY = gap + i * (subHeight + gap);
        ctx.fillStyle = '#F4F4F5';
        ctx.fillRect(rightX, subY, rightWidth, subHeight);
        if (loadedImages[i + 1]) {
          drawImageCover(ctx, loadedImages[i + 1], rightX, subY, rightWidth, subHeight);
        }
      }
    }

    // Border highlights
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = gap;
    ctx.strokeRect(gap / 2, gap / 2, CW - gap, CH - gap);
  };

  const handlePublishComposite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canvasRef.current || isSubmittingComposite) return;
    if (!compositeTitle.trim()) {
      alert("Please enter a valid title for this combined process piece.");
      return;
    }

    setIsSubmittingComposite(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
      
      const newArtwork: Artwork = {
        id: Math.random().toString(36).substr(2, 9),
        order: artworks.filter(a => a.type === 'SI').length, 
        imageUrl: dataUrl,
        title: compositeTitle.trim(),
        materials: compositeMaterials.trim() || 'Aesthetic process collage study',
        processText: compositeProcess.trim() || 'Arranged sequential stages compiled on-platform.',
        dimensions: compositeDimensions.trim() || '12" x 9"',
        ideas: compositeIdeas.trim() || 'Visual inquiry representation of sustained development.',
        type: 'SI',
        createdAt: Date.now(),
        submittedAt: Date.now()
      };

      await onArtworkAddedFromComposite(newArtwork);
      
      setSelectedPhotoIds([]);
      setActiveFilter('all');
      setActiveWorkspace('log');
      alert(`Success! "${newArtwork.title}" has been successfully appended to your official Sustained Investigation catalog!`);
    } catch (err) {
      console.error(err);
      alert("Error generating structural collage layout output.");
    } finally {
      setIsSubmittingComposite(false);
    }
  };

  const filteredPhotos = progressPhotos.filter(p => {
    if (activeFilter === 'all') return true;
    return p.siArtworkId === activeFilter;
  });

  return (
    <div className="space-y-8 text-left" id="native-camera-photos-workspace">
      
      {/* SECTION BANNER WITH VIEW SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-ink/5 pb-6">
        <div>
          <h3 className="text-3xl editorial-title text-brand-primary">Student Progress Logs</h3>
          <p className="text-xs text-ink/60 mt-1.5 max-w-xl">
            Securely capture daily progress steps via mobile camera or file upload, and use our template generator to bind stages into official collage studies.
          </p>
        </div>

        <div className="flex bg-ink/5 p-1 rounded-xl items-center gap-1 font-mono text-[10px] uppercase tracking-wider font-bold shrink-0 shadow-inner">
          <button
            onClick={() => {
              setActiveWorkspace('log');
              setSelectedPhotoIds([]);
            }}
            className={`px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 ${activeWorkspace === 'log' ? 'bg-white text-brand-primary shadow' : 'text-ink/60 hover:text-ink'}`}
          >
            <Camera size={13} strokeWidth={2.5} /> Daily Snapshots
          </button>
          <button
            onClick={() => setActiveWorkspace('collage')}
            className={`px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 ${activeWorkspace === 'collage' ? 'bg-white text-brand-primary shadow' : 'text-ink/60 hover:text-ink'}`}
          >
            <Layout size={13} strokeWidth={2.5} /> Layout Board Studio
          </button>
        </div>
      </div>

      {activeWorkspace === 'log' ? (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* TOP CONTROLS RIBBON - REPLACING HEAVY COMPLICATED SIDEBAR */}
          <div className="bg-paper border border-ink/10 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
            
            {/* Required Step Option: Selecting row */}
            <div className="space-y-2 flex-1 max-w-md">
              <span className="text-[10px] font-mono font-bold text-brand-primary uppercase tracking-widest block">Step 1 — Row Assignment (Required) *</span>
              <select
                value={selectedSiRow}
                onChange={(e) => setSelectedSiRow(e.target.value)}
                className="w-full text-sm font-semibold p-3.5 rounded-xl border-2 border-brand-primary/20 bg-white outline-none focus:border-brand-primary transition-all text-brand-primary shadow-sm"
              >
                <option value="">⚠️ Select Target Sustained Investigation Row first...</option>
                {siOptions.map(opt => (
                  <option key={opt} value={opt}>📂 {opt} Process Log Folder</option>
                ))}
              </select>
            </div>

            {/* Input Log Note optional fields */}
            <div className="space-y-2 flex-1 max-w-sm">
              <span className="text-[10px] font-mono font-bold text-ink/40 uppercase tracking-widest block">Step 2 — Process Action Note (Optional)</span>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 80))}
                disabled={!selectedSiRow}
                placeholder={selectedSiRow ? "e.g., Mixing gesso, layout draft..." : "Select SI row first to type note..."}
                className="w-full p-3.5 rounded-xl border border-ink/10 bg-white text-xs outline-none focus:border-brand-primary/45 font-sans"
              />
            </div>

            {/* Step 3 Camera & Import Selection Group */}
            <div className="flex flex-col sm:flex-row gap-3 min-w-[280px]">
              {isEditable ? (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={cameraInputRef}
                    onChange={handleCameraChange}
                    className="hidden"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    ref={libraryInputRef}
                    onChange={handleLibraryChange}
                    className="hidden"
                  />

                  <div className="flex flex-col w-full gap-2 justify-center">
                    <button
                      type="button"
                      disabled={!selectedSiRow || uploading}
                      onClick={() => cameraInputRef.current?.click()}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                        selectedSiRow 
                          ? 'bg-brand-primary text-white hover:bg-brand-primary/95 shadow-md active:scale-[0.98]' 
                          : 'bg-ink/5 text-ink/30 cursor-not-allowed border border-ink/5'
                      }`}
                    >
                      <Camera size={14} /> Open Mobile Camera
                    </button>
                    <button
                      type="button"
                      disabled={!selectedSiRow || uploading}
                      onClick={() => libraryInputRef.current?.click()}
                      className={`w-full py-2 px-4 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                        selectedSiRow 
                          ? 'bg-white border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/5' 
                          : 'bg-ink/5 text-ink/30 cursor-not-allowed'
                      }`}
                    >
                      <Upload size={14} /> Import File
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-ink/50 bg-ink/5 p-3 rounded-xl border">
                  <AlertCircle size={14} /> Educator Read-Only Review
                </div>
              )}
            </div>
            

          </div>

          {/* DENSITY & FILTER TOOLBAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            
            {/* SI Selection Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeFilter === 'all' 
                    ? 'bg-brand-primary text-white shadow' 
                    : 'bg-ink/5 text-ink/60 hover:text-ink hover:bg-ink/10'
                }`}
              >
                💼 All Logs ({progressPhotos.length})
              </button>
              {siOptions.map(opt => {
                const count = progressPhotos.filter(p => p.siArtworkId === opt).length;
                return (
                  <button
                    key={opt}
                    onClick={() => setActiveFilter(opt)}
                    className={`px-3.5 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                      activeFilter === opt 
                        ? 'bg-brand-primary text-white shadow' 
                        : 'bg-ink/5 text-ink/60 hover:text-ink hover:bg-ink/10'
                    }`}
                  >
                    {opt} ({count})
                  </button>
                );
              })}
            </div>

            {/* Dynamic Card Sizing Toggle */}
            <div className="flex bg-ink/5 p-1 rounded-lg items-center gap-0.5 shrink-0 ml-auto select-none">
              <button
                onClick={() => setDensity('spacious')}
                className={`p-1.5 rounded transition-all ${density === 'spacious' ? 'bg-white text-brand-primary shadow-sm' : 'text-ink/40'}`}
                title="Spacious grid"
              >
                <Grid size={13} />
              </button>
              <button
                onClick={() => setDensity('dense')}
                className={`p-1.5 rounded transition-all ${density === 'dense' ? 'bg-white text-brand-primary shadow-sm' : 'text-ink/40'}`}
                title="Dense contact sheet"
              >
                <List size={13} />
              </button>
            </div>

          </div>

          {/* DYNAMIC GRID GALLERY DISPLAY */}
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-24 bg-ink/5 rounded-3xl border border-dashed border-ink/15">
              <ImageIcon className="mx-auto block text-ink/25 mb-4" size={40} />
              <p className="text-sm font-semibold text-ink/50">No progress photos logged under active folder filter.</p>
              <p className="text-xs text-ink/40 mt-1 max-w-sm mx-auto">
                {selectedSiRow ? `Assign a photo to ${selectedSiRow} first to populate these folders!` : "Select an SI Row in Step 1 to upload process logs."}
              </p>
            </div>
          ) : (
            <div className={`grid gap-6 ${density === 'spacious' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'}`}>
              {filteredPhotos.map((photo) => (
                <div 
                  key={photo.id} 
                  className="brutal-card bg-paper border border-ink/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  {/* Photo Canvas Frame */}
                  <div className="aspect-[4/3] bg-ink/5 relative overflow-hidden group select-none">
                    <img 
                      src={photo.imageUrl} 
                      alt={photo.caption || 'Progress Study'} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                    
                    {/* Delete Controls (For student portfolio logs) */}
                    {isEditable && (
                      <button
                        onClick={(e) => handleDeletePhoto(photo.id, e)}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 hover:bg-red-50 text-ink/70 hover:text-red-600 flex items-center justify-center border border-ink/10 transition-colors shadow-sm z-10"
                        title="Delete photo"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}

                    {/* Active Row Assignment Overlay */}
                    <div className="absolute bottom-2.5 left-2.5 p-1.5 px-2.5 bg-brand-primary/95 text-white font-mono text-[9px] uppercase tracking-wider font-bold rounded-lg shadow-sm">
                      {photo.siArtworkId}
                    </div>
                  </div>

                  {/* Clean text metadata and reassignment card tray */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-ink/75 font-sans leading-relaxed line-clamp-2">
                      {photo.caption || <span className="italic text-ink/30 font-serif">Logged with empty note.</span>}
                    </p>

                    <div className="pt-2 border-t border-ink/5 flex items-center justify-between text-[9px] font-mono text-ink/40">
                      <span>{new Date(photo.uploadedAt).toLocaleDateString()}</span>
                      
                      {isEditable ? (
                        <div className="flex items-center gap-1">
                          <label className="text-[8px] font-mono opacity-50 uppercase tracking-widest text-ink">Change Folder:</label>
                          <select
                            value={photo.siArtworkId}
                            onChange={(e) => handleUpdateAssociation(photo.id, e.target.value)}
                            className="bg-transparent font-bold text-brand-primary outline-none focus:ring-1 pr-1 cursor-pointer"
                          >
                            {siOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="font-bold text-brand-primary">{photo.siArtworkId} Log</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      ) : (
        /* SPATIALLY POLISHED COMPOSITE COLLAGE BUILDER */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-300">
          
          {/* SELECTION BASKET - LEFT COLUMN OR MAIN CONTROLLER */}
          <div className="lg:col-span-4 space-y-6">
            <div className="brutal-card bg-paper border border-ink/10 rounded-2xl p-6 shadow-sm">
              <span className="text-[9px] font-mono font-bold text-brand-primary uppercase tracking-widest block mb-1">Canvas Setup</span>
              <h4 className="text-lg font-display font-medium text-ink mb-1">Composition Selector</h4>
              <p className="text-xs text-ink/50 mb-6">Step 1 — Mark 3 or 4 logged snapshots from your collection to start stitching of values.</p>

              <div className="space-y-4">
                {progressPhotos.length === 0 ? (
                  <div className="text-center py-10 bg-ink/5 rounded-xl text-xs font-mono text-ink/40">
                    No logs recorded yet. Go back to take some pictures!
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {progressPhotos.map((photo) => {
                      const isChecked = selectedPhotoIds.includes(photo.id);
                      return (
                        <div
                          key={photo.id}
                          onClick={() => handleToggleSelectForComposite(photo.id)}
                          className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border transition-all ${
                            isChecked 
                              ? 'border-brand-primary ring-2 ring-brand-primary bg-brand-primary/5' 
                              : 'border-ink/5 grayscale scale-95 opacity-70 hover:opacity-100 hover:scale-100 hover:grayscale-0'
                          }`}
                          title={`Assigned to ${photo.siArtworkId}`}
                        >
                          <img src={photo.imageUrl} className="w-full h-full object-cover" />
                          <div className={`absolute top-1 left-1 w-4 h-4 rounded-full border flex items-center justify-center ${
                            isChecked ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white/90 border-ink/10'
                          }`}>
                            {isChecked && <Check size={8} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {selectedPhotoIds.length > 0 && (
                  <button
                    onClick={() => setSelectedPhotoIds([])}
                    className="w-full text-center text-xs text-red-500 font-mono hover:underline uppercase block pt-2"
                  >
                    Clear board selection
                  </button>
                )}
              </div>
            </div>

            {/* QUICK COLLAGE DETAILS DISPLAY */}
            <div className="bg-brand-primary/5 rounded-2xl p-6 border border-brand-primary/10 text-xs text-brand-primary leading-relaxed space-y-3">
              <h5 className="font-mono font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Grid Synthesizer Guidance
              </h5>
              <p>
                In your sustained investigation portfolio, submitting developmental study series counts as active experimentation. Combining sequences is a certified high-scoring method!
              </p>
              <div className="text-[11px] font-medium p-2 bg-white rounded-lg border border-brand-primary/10">
                ✔️ Select exactly <strong>3 or 4 photos</strong> from the repository grid above to generate layout.
              </div>
            </div>
          </div>

          {/* DYNAMIC CANVAS BOARD & COMPILE CONTROLS - RIGHT COLUMN */}
          <div className="lg:col-span-8 space-y-8">
            {selectedPhotoIds.length < 3 ? (
              <div className="py-24 text-center bg-ink/5 border-2 border-dashed border-ink/10 rounded-3xl flex flex-col items-center justify-center select-none text-ink/35">
                <Layout size={40} className="mb-4 text-ink/20 animate-pulse" />
                <p className="text-sm font-semibold">Stitch Board Awaiting Selection</p>
                <p className="text-xs text-ink/40 mt-1 max-w-xs leading-relaxed">
                  Please tap at least 3 photos on the left library table to establish the rendering stage.
                </p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-300">
                
                {/* 1. LAYOUT PRESETS */}
                <div className="bg-paper border border-ink/10 rounded-2xl p-6 shadow-sm space-y-4">
                  <span className="text-[9px] font-mono font-bold text-ink/50 uppercase tracking-widest block">Step 2 — Design Template Arrangement</span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'grid', label: 'Matrix Grid', desc: 'Symmetrical 2x2 study' },
                      { id: 'horizontal', label: 'Filmstrip Banner', desc: 'Side-by-side progression' },
                      { id: 'vertical', label: 'Vertical Row', desc: 'Sequential vertical strip' },
                      { id: 'split', label: 'Split Focus Board', desc: '1 Primary, side sub-steps' }
                    ].map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => setSelectedTemplate(tpl.id as any)}
                        type="button"
                        className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-20 ${
                          selectedTemplate === tpl.id 
                            ? 'border-brand-primary bg-brand-primary/5 text-brand-primary ring-1 ring-brand-primary/10' 
                            : 'border-ink/5 bg-paper text-ink/65 hover:border-ink/15 hover:text-ink'
                        }`}
                      >
                        <span className="text-xs font-bold block leading-none">{tpl.label}</span>
                        <span className="text-[9px] font-mono opacity-60 leading-tight block">{tpl.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* HTML5 Canvas Rendering frame */}
                  <div className="pt-4 border-t border-ink/5 flex flex-col items-center justify-center">
                    <div className="bg-ink/5 border border-ink/10 rounded-2xl p-4 w-full max-w-lg shadow-inner">
                      <canvas ref={canvasRef} className="w-full aspect-[4/3] rounded-lg object-contain bg-white shadow" />
                    </div>
                  </div>
                </div>

                {/* 2. SPECIFICATION FORM */}
                <form onSubmit={handlePublishComposite} className="bg-paper border border-ink/10 rounded-2xl p-6 shadow-sm space-y-5">
                  <span className="text-[9px] font-mono font-bold text-brand-primary uppercase tracking-widest block">Step 3 — Write AP Catalog Details</span>
                  
                  <div>
                    <label className="text-[9px] font-mono font-bold text-ink/50 uppercase tracking-widest block mb-1">Portfolio Artwork Title</label>
                    <input
                      type="text"
                      value={compositeTitle}
                      onChange={(e) => setCompositeTitle(e.target.value.slice(0, 100))}
                      className="w-full px-3 py-2.5 bg-white border border-ink/10 rounded-lg text-xs outline-none focus:border-brand-primary font-bold text-ink"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-mono font-bold text-ink/50 uppercase tracking-widest block mb-1">Materials Used</label>
                      <input
                        type="text"
                        value={compositeMaterials}
                        onChange={(e) => setCompositeMaterials(e.target.value.slice(0, 100))}
                        className="w-full px-3 py-2.5 bg-white border border-ink/10 rounded-lg text-xs outline-none focus:border-brand-primary text-ink"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono font-bold text-ink/50 uppercase tracking-widest block mb-1">Dimensions</label>
                      <input
                        type="text"
                        value={compositeDimensions}
                        onChange={(e) => setCompositeDimensions(e.target.value.slice(0, 50))}
                        className="w-full px-3 py-2.5 bg-white border border-ink/10 rounded-lg text-xs outline-none focus:border-brand-primary text-ink"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono font-bold text-ink/50 uppercase tracking-widest block mb-1">Process Narrative (Prompt 2) *</label>
                    <textarea
                      value={compositeProcess}
                      onChange={(e) => setCompositeProcess(e.target.value.slice(0, 500))}
                      placeholder="Explain your sequential evolutionary choices (e.g., initial block-in layers, structural shifts, material revisions)..."
                      className="w-full p-3 bg-white border border-ink/10 rounded-lg text-xs outline-none focus:border-brand-primary text-ink resize-none h-24"
                      required
                    />
                  </div>

                  {isEditable ? (
                    <button
                      type="submit"
                      disabled={isSubmittingComposite}
                      className="w-full py-4.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      <Check size={14} strokeWidth={2.5} /> {isSubmittingComposite ? 'Printing collage canvas...' : 'Publish Composite Artwork to SI Portfolio'}
                    </button>
                  ) : (
                    <div className="bg-red-500/5 text-red-600 rounded-xl p-3.5 border border-red-500/10 text-[10px] text-center">
                      Educator Mode: Student-specific composite commits must be handled by the respective account owner.
                    </div>
                  )}

                </form>

              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
