'use client';

import {
  BrushCleaning,
  Circle,
  Download,
  MousePointer2,
  Palette,
  Pen,
  Square,
  Trash,
  Type,
  Plus,
  ArrowRight,
  Target,
  ZoomOut,
  ZoomIn,
  PanelRight,
  ImagePlus,
  Save,
  X,
} from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import SidebarChatbot from './SidebarChatbox';
import { fabric } from 'fabric';
import { AddImageDialog } from './AddImageDialog';
type JsPDFInstance = import('jspdf').jsPDF;
type JsPDFConstructor = new (...args: unknown[]) => JsPDFInstance;

// Simple Slider component
const Slider = ({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  className,
}: {
  value: number[];
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number[]) => void;
  className?: string;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseFloat(e.target.value)]);
  };

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={handleChange}
      className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider ${className}`}
      style={{
        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((value[0] - min) / (max - min)) * 100}%, #374151 ${((value[0] - min) / (max - min)) * 100}%, #374151 100%)`,
      }}
    />
  );
};

export default function CanvasNotebook({
  documentId,
  isdemo,
}: {
  documentId?: string;
  isdemo?: boolean;
}) {
  type ChatMessageItem = { role: 'user' | 'assistant'; content: string };
  type ExtendedCanvas = fabric.Canvas & {
    isReady?: boolean;
    laserSession?: {
      paths: fabric.Object[];
      timer: ReturnType<typeof setTimeout> | null;
      fadeTimer: ReturnType<typeof setInterval> | null;
      lastActivity: number;
    };
    __mouseDownHandler?: (opt: fabric.IEvent<Event>) => void;
  __mouseMoveHandler?: (opt: fabric.IEvent<Event>) => void;
  };
  type FabricWithArrow = typeof fabric & {
    Arrow: new (
      points: number[],
      options?: { stroke?: string; strokeWidth?: number },
    ) => fabric.Group;
    ArrowBrush: new (canvas: fabric.Canvas) => fabric.PencilBrush;
  };
  type PageData = { page_index: number; data: unknown };

  const [demo] = useState<boolean>(!!isdemo);
  const [canvasIds, setCanvasIds] = useState<string[]>([uuidv4()]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const canvasRefs = useRef<Record<string, ExtendedCanvas>>({});
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [fabricLoaded, setFabricLoaded] = useState(false);
  const [activeTool, setActiveTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [pendingObjectType, setPendingObjectType] = useState<'rectangle' | 'circle' | 'text' | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Arrow-specific state
const [arrowStartPoint, setArrowStartPoint] = useState<fabric.Point | null>(null);
const [tempArrowLine, setTempArrowLine] = useState<fabric.Line | null>(null);

  // Zoom functionality
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(true);

  // For chat persistance
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // For tablet screens
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsTablet(window.innerWidth >= 768 && window.innerWidth <= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const debouncedSave = useRef<ReturnType<typeof setTimeout> | null>(null);

  fabric.Object.prototype.cornerStyle = 'circle';
  fabric.Object.prototype.cornerColor = '#00bfff';
  fabric.Object.prototype.cornerStrokeColor = '#00bfff';
  fabric.Object.prototype.borderColor = '#00bfff';
  fabric.Object.prototype.transparentCorners = false;
  fabric.Object.prototype.cornerSize = 7;
  fabric.Object.prototype.padding = 2;

  const ensureCustomObjectsRegistered = () => {
    const fabricGlobal = window.fabric as unknown as FabricWithArrow | undefined;
    if (fabricGlobal && !fabricGlobal.Arrow) {
      addArrowFunctionality();
    }

    // Ensure classes are properly registered for deserialization
    if (fabricGlobal && fabricGlobal.Arrow && !(fabricGlobal.Arrow as unknown as { fromObject?: unknown }).fromObject) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fabricGlobal.Arrow as any).fromObject = function (
        object: { points?: number[]; stroke?: string; strokeWidth?: number } & Record<string, unknown>,
        callback?: (obj: fabric.Object) => void,
      ) {
        const points = object.points || [0, 0, 100, 100];
        const options = {
          stroke: object.stroke || '#000000',
          strokeWidth: object.strokeWidth || 2,
        };
        const arrow = new fabricGlobal.Arrow(points, options);

        // Copy over ALL properties from the saved object
        Object.keys(object).forEach((key) => {
          if (key !== 'type' && key !== 'version' && key !== 'objects') {
            arrow.set(key as keyof fabric.Group, object[key as keyof typeof object]);
          }
        });

        arrow.setCoords();
        if (callback) callback(arrow);
        return arrow;
      };
    }
  };

  const debouncedSaveToServer = useCallback((docId: string) => {
    if (debouncedSave.current) {
      clearTimeout(debouncedSave.current);
    }

    debouncedSave.current = setTimeout(() => {
      saveAllPagesToServer(docId);
    }, 1000); // Wait 1 second after last call
  }, []);

  // Load Fabric.js with arrow functionality
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.fabric) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
      script.onload = () => {
        // Add the arrow functionality to Fabric.js after it loads
        ensureCustomObjectsRegistered();
        addArrowFunctionality();
        setFabricLoaded(true);
      };
      document.head.appendChild(script);
    } else if (window.fabric) {
      ensureCustomObjectsRegistered();
      addArrowFunctionality();
      setFabricLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingLoadPagesRef = useRef<PageData[] | null>(null);

  const loadPagesFromServer = async (docId: string) => {
    setIsLoadingCanvas(true);
    if (!docId) return;
    console.log('Loading pages from server for document:', docId);
    try {
      const res = await fetch(`/api/pages/load?document_id=${docId}`);
      if (!res.ok) {
        console.error('Failed to load pages');
        return;
      }
      const json = await res.json();
      const pages: PageData[] = json.pages || [];
      setIsLoadingCanvas(false);
      console.log('Received pages from server:', pages);

      if (pages.length === 0) {
        console.log('No pages found, keeping default single blank page');
        setCanvasIds([uuidv4()]);
        setIsLoadingCanvas(false);
        return;
      }

      // Sort pages by page_index to ensure correct order
      const sortedPages = pages.sort((a, b) => a.page_index - b.page_index);

      console.log('Creating canvas IDs for', sortedPages.length, 'pages');
      setCanvasIds(sortedPages.map(() => uuidv4()));

      // Ensure custom extensions are loaded before setting pending pages
      if (window.fabric && !(window.fabric as unknown as FabricWithArrow).Arrow) {
        addArrowFunctionality();
      }

      pendingLoadPagesRef.current = sortedPages;
      console.log('Set pending pages for loading:', sortedPages);
    } catch (err) {
      console.error('Error loading pages:', err);
      // On error, ensure we have at least one page
      setCanvasIds([uuidv4()]);
    }
  };

  // apply pending pages once fabric & canvases are ready
  useEffect(() => {
    if (!fabricLoaded || !window.fabric || !pendingLoadPagesRef.current) return;

    const pages = pendingLoadPagesRef.current;
    console.log('Attempting to load content for pages:', pages);

    // Ensure custom objects are registered
    if (!(window.fabric as unknown as FabricWithArrow).Arrow) {
      addArrowFunctionality();
    }

    const loadTimer = setTimeout(() => {
      // Only load pages that have corresponding canvas IDs
      const validPages = pages.filter((p) => {
        const idx = p.page_index;
        return idx >= 0 && idx < canvasIds.length;
      });

      console.log(`Loading ${validPages.length} valid pages out of ${pages.length} total pages`);

      validPages.forEach((p) => {
        const idx = p.page_index;
        const canvasId = canvasIds[idx];
        const canvas = canvasRefs.current[canvasId];

        if (canvas) {
          console.log(`Loading content for page ${idx}:`, p.data);

          try {
            // Custom reviver function to handle custom object types
            const reviver = (obj: Record<string, unknown>, error: unknown) => {
              if (error) {
                console.warn(`Skipping unknown object type:`, obj?.type, error);
                return null; // Skip unknown objects instead of throwing error
              }

              // Handle custom Arrow objects
              if (obj.type === 'arrow' && window.fabric && (window.fabric as unknown as FabricWithArrow).Arrow) {
                try {
                  const fabricGlobal = window.fabric as unknown as FabricWithArrow;
                  const arrow = new fabricGlobal.Arrow((obj as { points?: number[] }).points || [0, 0, 100, 100], {
                    stroke: (obj as { stroke?: string }).stroke || '#000000',
                    strokeWidth: (obj as { strokeWidth?: number }).strokeWidth || 2,
                  });

                  // Copy over other properties
                  Object.keys(obj).forEach((key) => {
                    if (
                      key !== 'type' &&
                      key !== 'version' &&
                      key !== 'objects' &&
                      key !== 'points'
                    ) {
                      arrow.set(key as keyof fabric.Group, (obj as Record<string, unknown>)[key]);
                    }
                  });

                  return arrow;
                } catch (arrowError) {
                  console.warn('Failed to create Arrow object:', arrowError);
                  return null;
                }
              }

              return obj;
            };

            canvas.loadFromJSON(
              p.data,
              () => {
                console.log(`Successfully loaded page ${idx}`);
                canvas.renderAll();
              },
              reviver,
            );
          } catch (error) {
            console.error(`Error loading page ${idx}:`, error);
          }
        } else {
          console.warn(`Canvas not ready for page ${idx}`);
        }
      });

      if (!pendingLoadPagesRef.current) {
        setIsLoadingCanvas(false);
      }

      setTimeout(() => {
        setIsLoadingCanvas(false);
      }, 100);

      pendingLoadPagesRef.current = null;
    }, 500);

    return () => clearTimeout(loadTimer);
  }, [fabricLoaded, canvasIds]);

  const saveAllPagesToServer = async (docId: string): Promise<void> => {
    if (!docId) {
      console.warn("No document id, can't save");
      return;
    }

    // Prevent multiple simultaneous saves
    if ((saveAllPagesToServer as { isSaving?: boolean }).isSaving) {
      console.log('Save already in progress, skipping...');
      return;
    }

    // Check if all canvases are properly initialized before saving
    const uninitializedCanvases = canvasIds.filter(
      (id) => !canvasRefs.current[id] || !canvasRefs.current[id].isReady,
    );
    if (uninitializedCanvases.length > 0) {
      console.warn(`Skipping save - ${uninitializedCanvases.length} canvases not ready yet`);
      return;
    }

    (saveAllPagesToServer as { isSaving?: boolean }).isSaving = true;

    try {

      // Build pages array with only ready canvases
      const validPages = [];
      let consecutiveIndex = 0;

      for (let i = 0; i < canvasIds.length; i++) {
        const id = canvasIds[i];
        const c = canvasRefs.current[id];

        if (!c || !c.isReady) {
          console.warn(`Canvas not ready for page ${i}, skipping save`);
          continue; // Skip this page but continue processing others
        }

        let canvasData;
        try {
          // Force all objects to update their properties before serialization
          c.getObjects().forEach((obj) => {
            if (obj.setCoords) obj.setCoords();
            obj.dirty = true;
          });

          canvasData = c.toJSON();
        } catch (jsonError) {
          console.error(`Error serializing canvas ${i}:`, jsonError);
          continue; // Skip this page but continue processing others
        }

        // Filter out temporary or problematic objects
        if (canvasData.objects) {
          canvasData.objects = canvasData.objects.filter((obj) => {
            // Use a more specific type for obj to avoid 'any'
            type CanvasObject = { type?: string; isTemp?: boolean; isLaser?: boolean };
            const typedObj = obj as CanvasObject;
            if (typedObj.isTemp) return false;
            // Skip objects without proper type
            if (!typedObj.type) return false;
            // Skip laser objects (they're temporary anyway)
            if (typedObj.isLaser) return false;
            return true;
          });
        }

        // Use consecutive index to avoid database constraint issues
        validPages.push({
          page_index: consecutiveIndex,
          data: canvasData,
        });
        consecutiveIndex++;
      }

      // Only proceed with save if we have valid pages
      if (validPages.length === 0) {
        console.warn('No valid pages to save, skipping save operation');
        return;
      }

      const pages = validPages;

      // Only save the current pages - don't add empty pages for deleted ones
      // The server should only have the pages that currently exist
      console.log(`Saving ${pages.length} pages, clearing any deleted pages from server`);

      console.log('Saving pages to server:', pages);

      const res = await fetch('/api/pages/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: docId, pages }),
      });

      if (!res.ok) {
        let errorDetails;
        try {
          errorDetails = await res.json();
        } catch {
          errorDetails = { error: `HTTP ${res.status}: ${res.statusText}` };
        }

        // Handle conflict (409) - save already in progress
        if (res.status === 409) {
          console.log('Save already in progress on server, skipping...');
          return; // Don't throw error, just skip
        }

        console.error('Save failed with details:', errorDetails);
        throw new Error(`Save failed: ${JSON.stringify(errorDetails)}`);
      } else {
        const result = await res.json();
        console.log('Saved successfully:', result);
      }
    } catch (err) {
      console.error('Error saving:', err);
      // Optional: Show user-friendly error message
      // alert('Failed to save. Please try again.');
    } finally {
      // Always reset the saving flag
      (saveAllPagesToServer as unknown as { isSaving: boolean }).isSaving = false;
    }
  };

  useEffect(() => {
    if (documentId) {
      loadPagesFromServer(documentId);
    } else {
      // If no documentId (new canvas), stop loading immediately
      setIsLoadingCanvas(false);
    }
  }, [documentId]);

  // Add arrow functionality to Fabric.js
  const addArrowFunctionality = () => {
    const fabricGlobal = window.fabric as unknown as FabricWithArrow | undefined;
    if (!fabricGlobal || (fabricGlobal as unknown as { Arrow?: unknown }).Arrow) return; // Already added

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabric = window.fabric as any;

    // Create Arrow class
    fabric.Arrow = fabric.util.createClass(fabric.Group, {
      type: 'arrow',

      initialize: function (points: number[], options?: Record<string, unknown>) {
        options = options || {};

        const [x1, y1, x2, y2] = points;

        // Calculate arrow properties
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);

        // Scale arrow head based on stroke width with much better proportions
        const strokeWidth = options.strokeWidth || 2;

        // Improved scaling for better visual balance
        const headLength = Math.max(12, Number(strokeWidth) * 8); // Longer arrow heads
        const headAngle = Math.PI / 5; // 36 degrees - wider angle for better shape

        // Calculate arrow head points first
        const head1X = x2 - headLength * Math.cos(angle - headAngle);
        const head1Y = y2 - headLength * Math.sin(angle - headAngle);
        const head2X = x2 - headLength * Math.cos(angle + headAngle);
        const head2Y = y2 - headLength * Math.sin(angle + headAngle);

        // Calculate the exact center of the arrow head base
        const baseCenterX = (head1X + head2X) / 2 - 1;
        const baseCenterY = (head1Y + head2Y) / 2 - 1;

        // Create main line that connects exactly to the center of the arrow base
        const line = new fabric.Line([x1, y1, baseCenterX, baseCenterY], {
          stroke: options.stroke || '#000000',
          strokeWidth: strokeWidth,
          strokeLineCap: 'butt',
          selectable: false,
          evented: false,
        });

        // Create a more proportional arrow head that overlaps with line
        const arrowHead = new fabric.Polygon(
          [
            { x: x2, y: y2 }, // Tip of arrow
            { x: head1X, y: head1Y }, // One wing
            { x: head2X, y: head2Y }, // Other wing
          ],
          {
            fill: options.stroke || '#000000',
            stroke: 'none', // No stroke for clean appearance
            strokeLineJoin: 'round',
            selectable: false,
            evented: false,
          },
        );

        // Create group with just line and arrow head
        const objects = [line, arrowHead];
        this.callSuper('initialize', objects, options);

        this.set({
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        });

        // Store the original points for serialization
        this.points = points;
      },

      // Add toObject method for proper serialization
      toObject: function (propertiesToInclude?: string[]) {
        const object = this.callSuper('toObject', propertiesToInclude);
        object.points = this.points;
        return object;
      },

      // Add fromObject method for proper serialization/deserialization
      fromObject: function (
        object: Record<string, unknown>,
        callback?: (arrow: fabric.Object) => void
      ) {
        const fabricWithArrow = window.fabric as unknown as FabricWithArrow;

        // Extract the points from the stored data
        const points = (object as { points?: number[] }).points || [0, 0, 100, 100];
        const options = {
          stroke: (object as { stroke?: string }).stroke || '#000000',
          strokeWidth: (object as { strokeWidth?: number }).strokeWidth || 2,
        };

        // Create a new Arrow instance
        const arrow = new fabricWithArrow.Arrow(points, options);

        // Copy over other properties
        fabric.util.object.extend(arrow, object);

        if (callback) callback(arrow);
        return arrow;
      },
    });

    // Register Arrow class with Fabric.js
    fabric.Arrow.fromObject = function (
      object: Record<string, unknown>,
      callback?: (arrow: fabric.Object) => void
    ) {
      const points = (object as { points?: number[] }).points || [0, 0, 100, 100];
      const options = {
        stroke: (object as { stroke?: string }).stroke || '#000000',
        strokeWidth: (object as { strokeWidth?: number }).strokeWidth || 2,
      };

      const fabricWithArrow = window.fabric as unknown as FabricWithArrow;
      const arrow = new fabricWithArrow.Arrow(points, options);
      // fabric.util.object.extend(arrow, object);

      Object.keys(object).forEach((key) => {
        if (key !== 'type' && key !== 'version' && key !== 'objects') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          arrow.set(key as any, (object as Record<string, unknown>)[key] as unknown);
        }
      });

      arrow.setCoords();

      if (callback) callback(arrow);
      return arrow;
    };

    // Register with Fabric.js class registry
    fabric.util.object.extend(fabric, {
      Arrow: fabric.Arrow,
    });

    // Create ArrowBrush class for drawing arrows
    fabric.ArrowBrush = fabric.util.createClass(fabric.PencilBrush, {
      type: 'arrowBrush',

      onMouseDown: function (
        pointer: fabric.Point,
        options: fabric.IEvent<Event>
      ) {
        if (!this.canvas._isMainEvent(options.e)) {
          return;
        }
        this._prepareForDrawing(pointer);
        this._captureDrawingPath(pointer);
        this._render();
      },

      onMouseMove: function (
        pointer: fabric.Point,
        options: fabric.IEvent<Event>
      ) {
        if (!this.canvas._isMainEvent(options.e)) {
          return;
        }
        this._captureDrawingPath(pointer);
        this._render();
      },

      onMouseUp: function (options: fabric.IEvent<Event>) {
        if (!this.canvas._isMainEvent(options.e)) {
          return;
        }
        this._finalizeAndAddPath();
      },

      _finalizeAndAddPath: function () {
        const ctx = this.canvas.contextTop;
        const canvas = this.canvas;

        ctx.closePath();

        if (this.decimate) {
          this._points = this.decimatePoints(this._points, this.decimate);
        }

        canvas.clearContext(canvas.contextTop);

        const pathData =
          this._points && this._points.length > 1
            ? this.convertPointsToSVGPath(this._points)
            : null;

        if (!pathData || this._isEmptySVGPath(pathData)) {
          canvas.fire('path:created');
          canvas.requestRenderAll();
          return;
        }

        // Create an Arrow object instead of a regular path
        if (this._points && this._points.length >= 2) {
          const firstPoint = this._points[0];
          const lastPoint = this._points[this._points.length - 1];

          const arrow = new fabric.Arrow([firstPoint.x, firstPoint.y, lastPoint.x, lastPoint.y], {
            stroke: this.color,
            strokeWidth: this.width,
          });

          canvas.add(arrow);
          canvas.fire('path:created', { path: arrow });
        }

        canvas.requestRenderAll();
        this._resetShadow();
      },
    });

    // Register the ArrowBrush class with Fabric.js
    fabric.util.object.extend(fabric, {
      ArrowBrush: fabric.ArrowBrush,
    });
  };

  // Scroll detection to determine current page
  const handleScroll = useCallback(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const scrollCenter = scrollTop + windowHeight / 2;

    let closestPageIndex = 0;
    let closestDistance = Infinity;

    canvasIds.forEach((id, index) => {
      const pageElement = pageRefs.current[id];
      if (pageElement) {
        const rect = pageElement.getBoundingClientRect();
        const pageCenter = rect.top + scrollTop + rect.height / 2;
        const distance = Math.abs(scrollCenter - pageCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestPageIndex = index;
        }
      }
    });

    if (closestPageIndex !== currentPageIndex) {
      setCurrentPageIndex(closestPageIndex);
    }
  }, [canvasIds, currentPageIndex]);

  // Set up scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Initialize canvases when Fabric.js is loaded
  useEffect(() => {
    if (!fabricLoaded || !window.fabric) return;

    canvasIds.forEach((id) => {
      if (!canvasRefs.current[id]) {
        const canvasElement = document.getElementById(`canvas-${id}`);
        if (canvasElement) {
          // Standard notebook dimensions (A4-like ratio)
          const canvasWidth = isTablet ? 600 : 794; // Smaller for tablets
          const canvasHeight = isTablet ? 848 : 1123; // Maintain aspect ratio

          const fabricCanvas = new window.fabric.Canvas(`canvas-${id}`, {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: '#ffffff',
          });

          (fabricCanvas as ExtendedCanvas).isReady = true; // Mark canvas as ready
          fabricCanvas.renderAll(); // Initial render

          canvasRefs.current[id] = fabricCanvas;

          // Set initial tool
          updateCanvasTool(fabricCanvas, activeTool);

          // Add selection event listeners for color changes
          fabricCanvas.on('selection:created', (e) => {
            setSelectedObject(
              e.selected && Array.isArray(e.selected) && e.selected.length > 0
                ? (e.selected[0])
                : null
            );
          });

          fabricCanvas.on('selection:updated', (e) => {
            setSelectedObject(
              e.selected && Array.isArray(e.selected) && e.selected.length > 0
                ? (e.selected[0])
                : null
            );
          });

          fabricCanvas.on('selection:cleared', () => {
            setSelectedObject(null);
          });
        }
      }
    });
  }, [fabricLoaded, canvasIds]);

  // Separate effect for handling object placement and arrow drawing
  useEffect(() => {
    if (!fabricLoaded || !window.fabric) return;

    const handleCanvasMouseDown = (canvasId: string) => (opt: { e: Event }) => {
      const canvas = canvasRefs.current[canvasId];
      if (!canvas) return;

      const pointer = canvas.getPointer(opt.e as MouseEvent);

      if (pendingObjectType) {
        createObjectAtPosition(canvas, pendingObjectType, pointer);
        setPendingObjectType(null);
        setActiveTool('text');
      } else if (activeTool === 'arrow') {
        if (!arrowStartPoint) {
          // Start drawing arrow
          setArrowStartPoint(new window.fabric.Point(pointer.x, pointer.y));

          // Create temporary line for visual feedback
          const tempLine = new window.fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: color,
            strokeWidth: brushSize,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
          } as fabric.ILineOptions);
          
          (tempLine as unknown as { isTemp: boolean }).isTemp = true;

          canvas.add(tempLine);
          setTempArrowLine(tempLine);
          canvas.renderAll();
        } else {
          // Finish drawing arrow
          if (tempArrowLine) {
            canvas.remove(tempArrowLine);
          }

          const arrow = new (window.fabric as unknown as FabricWithArrow).Arrow(
            [arrowStartPoint.x, arrowStartPoint.y, pointer.x, pointer.y],
            {
              stroke: color,
              strokeWidth: brushSize,
            },
          );

          canvas.add(arrow);
          canvas.renderAll();

          // Reset arrow state and switch to text tool
          setArrowStartPoint(null);
          setTempArrowLine(null);
          setActiveTool('text');
        }
      }
    };

    const handleCanvasMouseMove = (canvasId: string) => (opt: { e: Event }) => {
      const canvas = canvasRefs.current[canvasId];
      if (!canvas || !arrowStartPoint || !tempArrowLine) return;

      const pointer = canvas.getPointer(opt.e as MouseEvent);

      // Update temporary line
      tempArrowLine.set({
        x2: pointer.x,
        y2: pointer.y,
      });

      canvas.renderAll();
    };

    // Add listeners to all canvases
    canvasIds.forEach((id) => {
      const canvas = canvasRefs.current[id];
      if (canvas) {
        // Remove existing listeners first
        canvas.off('mouse:down', canvas.__mouseDownHandler);
        canvas.off('mouse:move', canvas.__mouseMoveHandler);

        // Create and store handlers
        canvas.__mouseDownHandler = handleCanvasMouseDown(id);
        canvas.__mouseMoveHandler = handleCanvasMouseMove(id);

        // Add new listeners
        canvas.on('mouse:down', canvas.__mouseDownHandler);
        canvas.on('mouse:move', canvas.__mouseMoveHandler);
      }
    });

    // Cleanup function
    return () => {
      canvasIds.forEach((id) => {
        const canvas = canvasRefs.current[id];
        if (canvas) {
          if (canvas.__mouseDownHandler) {
            canvas.off('mouse:down', canvas.__mouseDownHandler);
          }
          if (canvas.__mouseMoveHandler) {
            canvas.off('mouse:move', canvas.__mouseMoveHandler);
          }
        }
      });
    };
  }, [
    fabricLoaded,
    canvasIds,
    pendingObjectType,
    activeTool,
    arrowStartPoint,
    tempArrowLine,
    color,
    brushSize,
  ]);

  // Function to create objects at specific positions
  const createObjectAtPosition = (
    canvas: fabric.Canvas,
    objectType: 'rectangle' | 'circle' | 'text',
    pointer: { x: number; y: number },
  ) => {
    if (!canvas || !window.fabric) return;

    let newObject;

    switch (objectType) {
      case 'rectangle':
        newObject = new window.fabric.Rect({
          width: 100,
          height: 100,
          left: pointer.x - 50,
          top: pointer.y - 50,
          rx: 10,
          ry: 10,
          fill: 'transparent',
          stroke: color,
          strokeWidth: 2,
          selectable: true,
          
        });
        break;

      case 'circle':
        newObject = new window.fabric.Circle({
          left: pointer.x - 50,
          top: pointer.y - 50,
          radius: 50,
          fill: 'transparent',
          stroke: color,
          strokeWidth: 2,
          selectable: true,
          hasControls: true,
        });
        break;

      case 'text':
        newObject = new window.fabric.Textbox('Enter the text', {
          left: pointer.x - 50,
          top: pointer.y - 12,
          fontSize: 24,
          fill: color,
          editable: true,
          selectable: true,
          fontFamily: 'Inter, system-ui, sans-serif',
        });
        break;
    }

    if (newObject) {
      canvas.add(newObject);
      canvas.setActiveObject(newObject);
      canvas.renderAll();
    }
  };

  // Update tool for a specific canvas
  const updateCanvasTool = (canvas: fabric.Canvas, tool: string) => {
    if (!canvas || !window.fabric) return;

    // Clear selection and deselect objects when switching to drawing tools
    if (tool === 'pen' || tool === 'laser' || tool === 'arrowDraw') {
      canvas.discardActiveObject();
      canvas.renderAll();
      setSelectedObject(null);
    }

    // Reset arrow state when switching tools
    if (tool !== 'arrow' && arrowStartPoint) {
      const currentCanvas = getCurrentCanvas();
      if (currentCanvas && tempArrowLine) {
        currentCanvas.remove(tempArrowLine);
        currentCanvas.renderAll();
      }
      setArrowStartPoint(null);
      setTempArrowLine(null);
    }

    // Only disable drawing mode and enable selection if we're not in placement mode or arrow mode
    if (!pendingObjectType && tool !== 'arrow') {
      canvas.isDrawingMode = false;
      canvas.selection = true;
    }

    // Clean up previous path:created listeners
    canvas.off('path:created');

    if (tool === 'pen' && !pendingObjectType) {
      canvas.isDrawingMode = true;
      canvas.selection = false;
      canvas.freeDrawingBrush = new window.fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = brushSize;

      canvas.on('path:created', function (opt) {
        const path = (opt as unknown as { path: fabric.Path })?.path;
        const points = path.path as unknown as [string, number, number][];
        const threshold = 5;

        const [, x0, y0] = points[0];
        const [, x1, y1] = points[points.length - 1];

        const dx = x1 - x0;
        const dy = y1 - y0;
        const length = Math.sqrt(dx * dx + dy * dy);

        let isStraight = true;

        for (let i = 1; i < points.length - 1; i++) {
          const [, x, y] = points[i];
          const distance =
            Math.abs(dy * x - dx * y + x1 * y0 - y1 * x0) / Math.sqrt(dx * dx + dy * dy);

          if (distance > threshold) {
            isStraight = false;
            break;
          }
        }

        const minLengthToConvert = 10;
        if (isStraight && length >= minLengthToConvert) {
          const line = new window.fabric.Line([x0, y0, x1, y1], {
            stroke: path.stroke,
            strokeWidth: path.strokeWidth,
            selectable: path.selectable,
          });

          canvas.remove(path);
          canvas.add(line);
        }
      });
    } else if (tool === 'arrowDraw' && !pendingObjectType) {
      canvas.isDrawingMode = true;
      canvas.selection = false;
      canvas.freeDrawingBrush = new (window.fabric as unknown as FabricWithArrow).ArrowBrush(canvas);
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = brushSize;
    } else if (tool === 'laser' && !pendingObjectType) {

      const ext = canvas as ExtendedCanvas; // already ExtendedCanvas

      if (!ext.laserSession) {
        ext.laserSession = { paths: [], timer: null, fadeTimer: null, lastActivity: Date.now() };
      }
      const session = ext.laserSession!;
      if (session.timer) clearTimeout(session.timer);
      canvas.isDrawingMode = true;
      canvas.selection = false;
      canvas.freeDrawingBrush = new window.fabric.PencilBrush(canvas);
      // Fixed red color for laser
      canvas.freeDrawingBrush.color = '#ef4444';
      canvas.freeDrawingBrush.width = brushSize;

      // Add glow effect to the brush itself for real-time drawing
      canvas.freeDrawingBrush.shadow = new window.fabric.Shadow({
        color: '#ef4444',
        blur: brushSize * 3,
        offsetX: 0,
        offsetY: 0,
      });

      // Initialize laser session tracking
      if (!ext.laserSession) {
        ext.laserSession = {
          paths: [],
          timer: null,
          fadeTimer: null,
          lastActivity: Date.now(),
        };
      }

      // Clear any existing laser session timer
      if (session.timer) {
        clearTimeout(session.timer);
      }
      if (session.fadeTimer) {
        clearInterval(session.fadeTimer);
      }

      // Add laser-specific path creation handler
      canvas.on('path:created', function (opt) {
        const path = (opt as unknown as { path: fabric.Path }).path as fabric.Path;

        // Create the path with immediate glow effect
        path.set({
          stroke: '#ef4444', // Fixed red color
          strokeWidth: brushSize,
          shadow: new window.fabric.Shadow({
            color: '#ef4444',
            blur: brushSize * 3,
            offsetX: 0,
            offsetY: 0,
          }),
          selectable: false,
          evented: false,
          opacity: 1,
        });

        

        // Clear existing timers when new stroke is created
        if (session && session.timer) {
          clearTimeout(session.timer);
        }
        if (session && session.fadeTimer) {
          clearInterval(session.fadeTimer);

          // Restore full opacity to all existing laser paths
          session.paths.forEach((laserPath: fabric.Object) => {
            if (canvas.getObjects().includes(laserPath)) {
              laserPath.set('opacity', 1);
            }
          });
        }

        // Add to current laser session
        session.paths.push(path);
        session.lastActivity = Date.now();

        // Fixed 1.5 second duration - start fade immediately after drawing
        session.timer = setTimeout(() => {
          // Start smooth fade-out animation
          const fadeSteps = 20; // Number of fade steps
          const fadeInterval = 250 / fadeSteps; // Total fade time: 250ms
          let currentStep = 0;

          session.fadeTimer = setInterval(() => {
            currentStep++;
            const opacity = Math.max(0, 1 - currentStep / fadeSteps);

            // Update opacity of all laser paths
            session.paths.forEach((laserPath: fabric.Object) => {
              if (canvas.getObjects().includes(laserPath)) {
                laserPath.set('opacity', opacity);
              }
            });

            canvas.requestRenderAll();

            // When fade is complete, remove all paths
            if (currentStep >= fadeSteps) {
              clearInterval(session.fadeTimer!);

              session.paths.forEach((laserPath: fabric.Object) => {
                if (canvas.getObjects().includes(laserPath)) {
                  canvas.remove(laserPath);
                }
              });

              // Reset laser session
              session.paths = [];
              session.timer = null;
              session.fadeTimer = null;
              session.lastActivity = Date.now();

              canvas.requestRenderAll();
            }
          }, fadeInterval);
        }, 1500); // Fixed 1.5 second duration

        canvas.requestRenderAll();
      });
    } else if (tool === 'arrow') {
      canvas.isDrawingMode = false;
      canvas.selection = false; // Disable selection when in arrow mode
    } else if (tool === 'text' || pendingObjectType) {
      canvas.isDrawingMode = false;
      canvas.selection = !pendingObjectType; // Disable selection when in placement mode
    }
  };

  // Update brush settings when tool/color/size changes
  useEffect(() => {
    if (!fabricLoaded || !window.fabric) return;

    Object.values(canvasRefs.current).forEach((canvas) => {
      if (canvas) {
        updateCanvasTool(canvas, activeTool);
      }
    });
  }, [activeTool, color, brushSize, fabricLoaded, pendingObjectType]);

  // Get current canvas based on current page
  const getCurrentCanvas = (): fabric.Canvas | null => {
    const currentId = canvasIds[currentPageIndex];
    return canvasRefs.current[currentId] ?? null;
  };

  // Function to change color of selected object
  const changeSelectedObjectColor = (newColor: string) => {
    const canvas = getCurrentCanvas();
    if (!canvas || !selectedObject) return;

    // Handle different object types
    if (selectedObject.type === 'textbox' || selectedObject.type === 'text') {
      // For text objects, change the fill color
      selectedObject.set('fill', newColor);
    } else if (selectedObject.type === 'path') {
      // For drawn paths (pen strokes), change the stroke color
      selectedObject.set('stroke', newColor);
    } else if (selectedObject.type === 'arrow') {
      // For arrows, change both line and head color
      const objects = (selectedObject as fabric.Group).getObjects();
      objects.forEach((obj: fabric.Object) => {
        if (obj.type === 'line') {
          obj.set('stroke', newColor);
        } else if (obj.type === 'polygon') {
          obj.set({ fill: newColor, stroke: newColor });
        }
      });
    } else if (selectedObject.type === 'rect' || selectedObject.type === 'circle') {
      // For shapes, change both fill and stroke based on current state
      if (selectedObject.fill && selectedObject.fill !== 'transparent') {
        selectedObject.set('fill', newColor);
      }
      if (selectedObject.stroke) {
        selectedObject.set('stroke', newColor);
      }
    } else {
      // Generic fallback - try both fill and stroke
      if (selectedObject.fill && selectedObject.fill !== 'transparent') {
        selectedObject.set('fill', newColor);
      } else if (selectedObject.stroke) {
        selectedObject.set('stroke', newColor);
      } else {
        selectedObject.set('fill', newColor);
      }
    }

    canvas.renderAll();
  };

  const addPage = async () => {
    const newCanvasIds = [...canvasIds, uuidv4()];
    setCanvasIds(newCanvasIds);
    setActiveTool('pen');

    // Immediately save the current state before adding the new page
    if (documentId && !isdemo) {
      try {
        // First, save the current state with existing canvases
        await saveAllPagesToServer(documentId);
        console.log('Saved current state before adding new page');

        // Then wait for the new canvas to be initialized and save again
        setTimeout(async () => {
          try {
            // Check if the new canvas is ready
            const newCanvasId = newCanvasIds[newCanvasIds.length - 1];
            const newCanvas = canvasRefs.current[newCanvasId];

            if (newCanvas && newCanvas.isReady) {
              await saveAllPagesToServer(documentId);
              console.log('Saved after new page canvas initialization');
            } else {
              // If new canvas isn't ready, save what we have
              console.log('New canvas not ready, saving existing pages');
              await saveAllPagesToServer(documentId);
            }
          } catch (err) {
            console.error('Failed to save after adding page:', err);
          }
        }, 1000); // Shorter timeout since we already saved the existing state
      } catch (err) {
        console.error('Failed to save current state before adding page:', err);
      }
    }
  };

  const deleteCurrentPage = async () => {
    if (canvasIds.length === 1) {
      alert('This is the only page');
      return;
    }

    const currentId = canvasIds[currentPageIndex];

    if (canvasRefs.current[currentId]) {
      canvasRefs.current[currentId].dispose();
      delete canvasRefs.current[currentId];
    }

    const newCanvasIds = canvasIds.filter((_, index) => index !== currentPageIndex);
    setCanvasIds(newCanvasIds);

    // Adjust current page index if necessary
    if (currentPageIndex >= newCanvasIds.length) {
      setCurrentPageIndex(newCanvasIds.length - 1);
    }

    // Clean up any orphaned canvas references
    Object.keys(canvasRefs.current).forEach((id) => {
      if (!newCanvasIds.includes(id)) {
        if (canvasRefs.current[id]) {
          canvasRefs.current[id].dispose();
        }
        delete canvasRefs.current[id];
      }
    });

    // Auto-save after deleting a page to persist the change
    if (documentId && !isdemo) {
      try {
        debouncedSaveToServer(documentId);
        console.log('Auto-saved after deleting page');
      } catch (err) {
        console.error('Failed to auto-save after deleting page:', err);
      }
    }
  };

  const clearCurrentPage = async () => {
    const canvas = getCurrentCanvas();
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();

      // Auto-save after clearing a page to persist the change
      if (documentId && !isdemo) {
        try {
          debouncedSaveToServer(documentId);
          console.log('Auto-saved after clearing page');
        } catch (err) {
          console.error('Failed to auto-save after clearing page:', err);
        }
      }
    }
  };

  const exportPDF = async () => {
    if (isdemo) {
      alert('Login to use this feature');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

    return new Promise<void>((resolve) => {
      script.onload = () => {
        const jsPDFCtor = (window as unknown as { jspdf: { jsPDF: JsPDFConstructor } }).jspdf.jsPDF;

        // Only export canvases that actually exist and have content
        const validCanvases = canvasIds
          .map((id) => canvasRefs.current[id])
          .filter((canvas) => canvas && canvas.getObjects && canvas.getObjects().length > 0);

        console.log('Canvas IDs:', canvasIds);
        console.log('Canvas refs:', Object.keys(canvasRefs.current));
        console.log('Valid canvases for export:', validCanvases.length);
        validCanvases.forEach((canvas, index) => {
          console.log(`Canvas ${index}:`, {
            objects: canvas.getObjects().length,
            width: canvas.width,
            height: canvas.height,
          });
        });

        if (validCanvases.length === 0) {
          alert('No content to export. Please add some content to your canvas first.');
          resolve();
          return;
        }

        const firstCanvas = validCanvases[0]!;
        const firstCanvasWidth = firstCanvas.getWidth();
        const firstCanvasHeight = firstCanvas.getHeight();
        const firstPdfWidth = (firstCanvasWidth * 72) / 96;
        const firstPdfHeight = (firstCanvasHeight * 72) / 96;

        const pdf = new jsPDFCtor({
          orientation: firstPdfWidth > firstPdfHeight ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [firstPdfWidth, firstPdfHeight],
          compress: true,
        });

        validCanvases.forEach((canvas, index) => {
          if (canvas) {
            const canvasWidth = canvas.getWidth();
            const canvasHeight = canvas.getHeight();
            const pdfWidth = (canvasWidth * 72) / 96;
            const pdfHeight = (canvasHeight * 72) / 96;

            if (index > 0) {
              pdf.addPage([pdfWidth, pdfHeight], pdfWidth > pdfHeight ? 'landscape' : 'portrait');
            }

            const dataURL = canvas.toDataURL({
              format: 'png',
              quality: 1.0,
              multiplier: 1,
            });

            pdf.addImage(dataURL, 'PNG', 0, 0, pdfWidth, pdfHeight);
          }
        });

        pdf.save('notebook.pdf');
        resolve();
      };

      document.head.appendChild(script);
    });
  };

  // Modified functions to set pending object type instead of immediately creating objects
  const prepareRectanglePlacement = () => {
    setPendingObjectType('rectangle');
    setActiveTool('text'); // Switch to selection mode to allow clicking
  };

  const prepareCirclePlacement = () => {
    setPendingObjectType('circle');
    setActiveTool('text'); // Switch to selection mode to allow clicking
  };

  const prepareTextPlacement = () => {
    setPendingObjectType('text');
    setActiveTool('text'); // Switch to selection mode to allow clicking
  };

  // Handle Delete key for removing selected objects
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
        // Get the current canvas ID directly from state
        const currentId = canvasIds[currentPageIndex];
        const canvas = canvasRefs.current[currentId];

        if (canvas) {
          const activeObject = canvas.getActiveObject();
          if (activeObject) {
            canvas.remove(activeObject);
            canvas.requestRenderAll();
            setSelectedObject(null); // Clear selected object state
          }
        }
      }

      // Handle Escape key to cancel pending object placement or arrow drawing
      if (e.key === 'Escape') {
        if (pendingObjectType) {
          setPendingObjectType(null);
          setActiveTool('pen');
        } else if (arrowStartPoint) {
          const currentCanvas = getCurrentCanvas();
          if (currentCanvas && tempArrowLine) {
            currentCanvas.remove(tempArrowLine);
            currentCanvas.renderAll();
          }
          setArrowStartPoint(null);
          setTempArrowLine(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex, canvasIds, pendingObjectType, arrowStartPoint, tempArrowLine]);

  const handleZoomIn = () => {
    setZoomLevel((prevZoom) => {
      if (prevZoom >= 2.5) return prevZoom; // Do nothing if at max
      return parseFloat((prevZoom + 0.1).toFixed(2));
    });
  };

  const handleZoomOut = () => {
    setZoomLevel((prevZoom) => {
      if (prevZoom <= 0.5) return prevZoom; // Do nothing if at min
      return parseFloat((prevZoom - 0.1).toFixed(2));
    });
  };

  // This function is adding text from the chatbot
  const addSelectedToCanvas = (textObject: unknown) => {
    const textbox = textObject as fabric.Textbox;
    const canvas = getCurrentCanvas();
    if (!canvas) {
      console.error('No canvas available');
      return;
    }

    try {
      // Add the text object to the canvas
      canvas.add(textbox);

      // Set it as the active object so user can see it's been added
      canvas.setActiveObject(textbox);

      // Make sure it's positioned within the visible canvas area
      const canvasCenter = {
        x: canvas.getWidth() / 2,
        y: canvas.getHeight() / 2,
      };

      // If the object is outside the canvas, center it
      const left = textbox.left ?? 0;
      const top = textbox.top ?? 0;
      const width = textbox.width ?? (textbox as unknown as fabric.Object).getScaledWidth?.() ?? 0;
      const height = textbox.height ?? (textbox as unknown as fabric.Object).getScaledHeight?.() ?? 0;

      if (left < 0 || left > canvas.getWidth() || top < 0 || top > canvas.getHeight()) {
        textbox.set({
          left: canvasCenter.x - width / 2,
          top: canvasCenter.y - height / 2,
        });
      }

      // Update object coordinates and render
      textbox.setCoords();
      canvas.renderAll();

      // Switch to selection tool so user can immediately edit the text
      setActiveTool('text');
      setPendingObjectType(null);

      console.log('Successfully added text to canvas:', textbox.text);
    } catch (error) {
      console.error('Error adding text to canvas:', error);
      alert('Failed to add text to canvas. Please try again.');
    }
  };

  // Reset zoom and pan
  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  if (!fabricLoaded || isLoadingCanvas) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm">
          {!fabricLoaded ? 'Loading canvas...' : 'Loading your content...'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171717] text-white overflow-hidden">
      {/* Save Warning Banner */}
      {!warningDismissed && !demo && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-600 to-orange-600 border-b border-amber-500/50 shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-amber-200 rounded-full animate-pulse"></div>
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-amber-100" />
                <span className="text-amber-100 text-sm font-medium">
                  Don&apos;t forget to click the Save button - otherwise your changes will be lost!
                </span>
              </div>
            </div>
            <button
              onClick={() => setWarningDismissed(true)}
              className="p-1 rounded-lg hover:bg-amber-500/30 transition-all duration-200 text-amber-100 hover:text-white"
              title="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area with Slide Animation */}
      <div
        className="transition-all duration-300 ease-out"
        style={{
          marginLeft: chatOpen ? (isTablet ? '320px' : '450px') : '0px',
          marginTop: !warningDismissed && !demo ? '52px' : '0px',
        }}
      >
        {/* Floating Toolbar - Updated with sliding animation */}
        <div
          className="fixed z-50 transition-all duration-300 ease-out"
          style={{
            top: !warningDismissed && !demo ? '70px' : '24px',
            left: chatOpen ? (isTablet ? 'calc(50% + 160px)' : 'calc(50% + 225px)') : '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-[#232323] backdrop-blur-xl border border-gray-800/50 rounded-2xl px-2 md:px-4 py-2 md:py-3 shadow-2xl">
            <div className="flex items-center gap-3">
              {/* Main Tools */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setPendingObjectType(null);
                    setActiveTool('pen');
                  }}
                  className={`p-2.5 rounded-xl transition-all duration-200 ${
                    activeTool === 'pen' && !pendingObjectType
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : 'text-white hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Pen className="w-4 h-4" />
                </button>

                <button
                  title="laser"
                  onClick={() => {
                    setPendingObjectType(null);
                    setActiveTool('laser');
                  }}
                  className={`p-2.5 rounded-xl transition-all duration-200 ${
                    activeTool === 'laser' && !pendingObjectType
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : 'text-white hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Target color="#E53103" className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setPendingObjectType(null);
                    setActiveTool('text');
                  }}
                  className={`p-2.5 rounded-xl transition-all duration-200 ${
                    activeTool === 'text' && !pendingObjectType
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : 'text-white hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <MousePointer2 className="w-4 h-4" />
                </button>
              </div>

              <div className="w-px h-6 bg-gray-700"></div>

              {/* Arrow Tool */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setPendingObjectType(null);
                    setActiveTool('arrow');
                    // Ensure arrow brush size is within allowed range
                    if (brushSize > 3) {
                      setBrushSize(3);
                    }
                  }}
                  className={`p-2.5 rounded-xl transition-all duration-200 ${
                    activeTool === 'arrow'
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                      : 'text-white hover:text-white hover:bg-gray-800'
                  }`}
                  title="Click to draw arrows"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="w-px h-6 bg-gray-700"></div>

              {/* Shapes */}
              <div className="flex items-center gap-1">
                <button
                  onClick={prepareRectanglePlacement}
                  className={`p-2.5 rounded-xl transition-all duration-200 ${
                    pendingObjectType === 'rectangle'
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                      : 'text-white hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Square className="w-4 h-4" />
                </button>

                <button
                  onClick={prepareCirclePlacement}
                  className={`p-2.5 rounded-xl transition-all duration-200 ${
                    pendingObjectType === 'circle'
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                      : 'text-white hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Circle className="w-4 h-4" />
                </button>

                <button
                  onClick={prepareTextPlacement}
                  className={`p-2.5 rounded-xl transition-all duration-200 ${
                    pendingObjectType === 'text'
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                      : 'text-white hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Type className="w-4 h-4" />
                </button>
              </div>

              <div className="w-px h-6 bg-gray-700"></div>

              {/* Color Picker - Hide when laser is active since it's fixed red */}
              {activeTool !== 'laser' && (
                <>
                  <div className="relative">
                    <label className="flex items-center cursor-pointer p-1.5 rounded-xl hover:bg-gray-800 transition-all duration-200">
                      <div
                        className="w-6 h-6 rounded-lg border-2 border-gray-600 shadow-inner"
                        style={{ backgroundColor: color }}
                      ></div>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        // disabled={activeTool === 'eraser'}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>
                  <div className="w-px h-6 bg-gray-700"></div>
                </>
              )}

              {/* Brush Size */}
              <div className="flex items-center gap-2 min-w-[80px]">
                <span className="text-xs text-white font-mono w-4">
                  {activeTool === 'pen' || activeTool === 'laser' || activeTool === 'arrow'
                    ? brushSize
                    : 0}
                </span>
                {activeTool === 'arrow' ? (
                  // Special arrow width selector with only 3 options
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((width) => (
                      <button
                        key={width}
                        onClick={() => setBrushSize(width)}
                        className={`w-6 h-6 rounded-lg border-2 transition-all duration-200 flex items-center justify-center text-xs font-mono ${
                          brushSize === width
                            ? 'border-blue-400 bg-blue-500/20 text-blue-300'
                            : 'border-gray-600 hover:border-gray-400 text-gray-400'
                        }`}
                      >
                        {width}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Slider
                    value={activeTool === 'pen' || activeTool === 'laser' ? [brushSize] : [0]}
                    min={1}
                    max={20}
                    onValueChange={(value) => {
                      if (activeTool === 'pen' || activeTool === 'laser') {
                        setBrushSize(Math.max(1, value[0]));
                      }
                      //  else {
                      //   setEraserBrushSize(Math.max(1, value[0]));
                      // }
                    }}
                    className="w-16"
                  />
                )}
              </div>

              <div className="w-px h-6 bg-gray-700"></div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button onClick={handleZoomOut}>
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={resetView}
                  className="p-2.5 rounded-xl text-white hover:text-white hover:bg-gray-800 transition-all duration-200"
                  title="Reset Zoom & Pan"
                >
                  <div className="w-4 h-4 flex items-center justify-center text-xs font-semibold">
                    {Math.round(zoomLevel * 100)}%
                  </div>
                </button>
                <button onClick={handleZoomIn}>
                  <ZoomIn className="w-4 h-4" />
                </button>

                <button
                  onClick={clearCurrentPage}
                  className="p-2.5 rounded-xl text-white hover:text-white hover:bg-gray-800 transition-all duration-200"
                >
                  <BrushCleaning className="w-4 h-4" />
                </button>

                <button
                  onClick={exportPDF}
                  className="p-2.5 rounded-xl text-white hover:text-white hover:bg-gray-800 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  disabled={isdemo}
                  onClick={() => setImageDialogOpen(true)}
                  className="p-2.5 rounded-xl text-white hover:text-white hover:bg-gray-800 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
                <button
                  disabled={isdemo}
                  onClick={() => documentId && saveAllPagesToServer(documentId)}
                  className="p-2.5 rounded-xl text-white hover:text-white hover:bg-gray-800 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
              {/* Dialog */}
              <AddImageDialog
                open={imageDialogOpen}
                onOpenChange={setImageDialogOpen}
                getCurrentCanvas={getCurrentCanvas}
                setActiveTool={setActiveTool}
              />
            </div>
          </div>
        </div>

        {/* Pending Object/Arrow Instruction */}
        {(pendingObjectType || (activeTool === 'arrow' && !arrowStartPoint)) && (
          <div
            className="fixed z-40 transition-all duration-300 ease-out"
            style={{
              top: !warningDismissed && !demo ? '138px' : '96px', // Adjust position based on warning banner
              left: chatOpen ? 'calc(50% + 225px)' : '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-green-900/95 backdrop-blur-xl border border-green-800/50 rounded-2xl px-4 py-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-100 text-sm font-medium">
                  {pendingObjectType
                    ? `Click on the canvas to place ${pendingObjectType === 'rectangle' ? 'rectangle' : pendingObjectType === 'circle' ? 'circle' : 'text'}`
                    : 'Click to start drawing arrow'}
                </span>
                <span className="text-green-300 text-xs">
                  {activeTool != 'arrow' ? '(Press Esc to cancel)' : ''}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Arrow Drawing in Progress */}
        {activeTool === 'arrow' && arrowStartPoint && (
          <div
            className="fixed z-40 transition-all duration-300 ease-out"
            style={{
              top: !warningDismissed && !demo ? '138px' : '96px', // Adjust position based on warning banner
              left: chatOpen ? 'calc(50% + 225px)' : '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-purple-900/95 backdrop-blur-xl border border-purple-800/50 rounded-2xl px-4 py-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-purple-100 text-sm font-medium">
                  Click to finish drawing arrow
                </span>
                <span className="text-purple-300 text-xs">(Press Esc to cancel)</span>
              </div>
            </div>
          </div>
        )}

        {/* Text tool selection Instruction */}
        {activeTool === 'text' && !pendingObjectType && !selectedObject && (
          <div
            className="fixed z-40 transition-all duration-300 ease-out"
            style={{
              top: !warningDismissed && !demo ? '138px' : '96px', // Adjust position based on warning banner
              left: chatOpen ? (isTablet ? 'calc(50% + 160px)' : 'calc(50% + 225px)') : '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-purple-900/95 backdrop-blur-xl border border-purple-800/50 rounded-2xl px-4 py-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-purple-100 text-sm font-medium">
                  Select object to modify or delete it
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Page Navigation */}
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-[#232323] backdrop-blur-xl border border-gray-800/50 rounded-2xl px-4 py-3 shadow-2xl">
            <div className="flex items-center gap-3">
              <button
                onClick={addPage}
                className="p-2 rounded-xl text-white hover:text-white hover:bg-gray-800 transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
              </button>

              <div className="text-sm text-gray-300 font-medium min-w-[80px] text-center">
                {currentPageIndex + 1} / {canvasIds.length}
              </div>

              <button
                onClick={deleteCurrentPage}
                disabled={canvasIds.length === 1}
                className="p-2 rounded-xl text-white hover:text-white hover:bg-gray-800 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Selected Object Color Picker */}
        {selectedObject && !pendingObjectType && selectedObject.type !== 'image' && (
          <div
            className="fixed z-40 transition-all duration-300 ease-out"
            style={{
              top: !warningDismissed ? '138px' : '96px', // Adjust position based on warning banner
              left: chatOpen ? 'calc(50% + 225px)' : '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 rounded-2xl px-4 py-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <Palette className="w-4 h-4 text-gray-400" />
                <div className="flex gap-2">
                  {[
                    '#000000',
                    '#ef4444',
                    '#22c55e',
                    '#3b82f6',
                    '#f59e0b',
                    '#a855f7',
                    '#06b6d4',
                    '#ffffff',
                  ].map((colorOption) => (
                    <button
                      key={colorOption}
                      onClick={() => changeSelectedObjectColor(colorOption)}
                      className="w-6 h-6 rounded-lg border-2 border-gray-600 hover:border-gray-400 hover:scale-110 transition-all duration-200 shadow-inner"
                      style={{ backgroundColor: colorOption }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  onChange={(e) => changeSelectedObjectColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-2 border-gray-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div
          id="canvas-area"
          className="flex flex-col items-center min-h-screen pt-24 pb-24 overflow-hidden"
          style={{
            cursor: isPanning
              ? 'grabbing'
              : zoomLevel !== 1 || panOffset.x !== 0 || panOffset.y !== 0
                ? 'grab'
                : 'default',
          }}
        >
          <div
            className="space-y-8 transition-transform duration-100 ease-out"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
              transformOrigin: 'center center',
            }}
          >
            {canvasIds.map((id) => (
              <div
                key={id}
                ref={(el) => {
                  pageRefs.current[id] = el;
                }}
                className={`relative transition-all duration-300 ${
                  pendingObjectType || activeTool === 'arrow' ? 'cursor-crosshair' : ''
                }`}
              >
                {/* Canvas Container - Fixed notebook-like dimensions */}
                <div className="bg-white rounded-2xl shadow-2xl" style={{ width: 'fit-content' }}>
                  <canvas
                    id={`canvas-${id}`}
                    className="rounded-xl border border-gray-100"
                    style={{
                      display: 'block',
                      maxWidth: '90vw', // Responsive but maintains aspect ratio
                      height: 'auto',
                      pointerEvents: isPanning ? 'none' : 'auto', // Disable canvas interactions while panning
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <style jsx>{`
          .slider {
            -webkit-appearance: none;
            appearance: none;
          }

          .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          .slider::-moz-range-thumb {
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
        `}</style>
      </div>

      {/* Chat Toggle Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className={`fixed z-50 p-2 rounded-lg transition-all duration-300 ${
          chatOpen
            ? `bg-blue-600 hover:bg-blue-700 text-white ${isTablet ? 'left-[340px]' : 'left-[500px]'}`
            : 'bg-gray-800 hover:bg-gray-700 text-white left-6'
        }`}
        style={{
          top: !warningDismissed && !demo ? '70px' : '24px', // Adjust position based on warning banner
        }}
        title={chatOpen ? 'Close Chat' : 'Open Chat'}
      >
        {chatOpen ? <PanelRight className="w-5 h-5" /> : <PanelRight className="w-5 h-5" />}
      </button>

      {/* Sidebar - Slides in from the left */}
      <div
        className={`fixed left-0 h-screen z-40 transition-transform duration-300 ease-out ${
          chatOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: isTablet ? '320px' : '350px',
          top: !warningDismissed && !demo ? '52px' : '0px',
          height: !warningDismissed && !demo ? 'calc(100vh - 52px)' : '100vh',
        }}
      >
        {chatOpen && (
          <SidebarChatbot
            isDemo={demo}
            onAddToCanvas={addSelectedToCanvas}
            messages={chatMessages}
            setMessages={setChatMessages}
            input={chatInput}
            setInput={setChatInput}
            loading={chatLoading}
            setLoading={setChatLoading}
          />
        )}
      </div>
    </div>
  );
}
