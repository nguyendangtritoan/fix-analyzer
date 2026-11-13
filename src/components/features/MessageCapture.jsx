import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Camera, Copy, Download, X } from 'lucide-react';
import FixMessagePanel from './FixMessagePanel';
import { getTagName } from '../../utils/fixUtils';
import { getCaptureRange } from '../../utils/messageCapture';
import { createMessageImage, downloadMessageImage } from '../../utils/messageImage';
import { lockDocumentScroll } from '../../utils/documentScrollLock';
import './MessageCapture.css';

const CapturePreview = ({ range, panelProps, onBack }) => {
  const panelRef = useRef(null);
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState('idle');
  const canCopy = Boolean(navigator.clipboard?.write && window.ClipboardItem);

  useEffect(() => {
    let active = true;
    createMessageImage(panelRef.current)
      .then(result => { if (active) setImage(result); })
      .catch(cause => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, []);

  const copyImage = async () => {
    setCopyState('copying');
    setError('');
    try {
      // The PNG is ready before this click, preserving browser user-activation rules.
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': image.blob })]);
      setCopyState('copied');
    } catch {
      setCopyState('idle');
      setError('Clipboard access was blocked. You can download the PNG instead.');
    }
  };

  return <>
    <div className="fix-capture-toolbar">
      <button type="button" autoFocus onClick={onBack}><ArrowLeft size={15} /> Change range</button>
      <span className="fix-capture-summary">{range[1] - range[0] + 1} rows · Rows {range[0] + 1}–{range[1] + 1}</span>
      <div className="fix-capture-actions">
        <button type="button" disabled={!image} onClick={() => downloadMessageImage(image.blob, `fix-message-rows-${range[0] + 1}-${range[1] + 1}.png`)}><Download size={15} /> Download PNG</button>
        <button type="button" className="fix-capture-primary" disabled={!image || !canCopy || copyState === 'copying'} onClick={copyImage}><Copy size={15} /> {copyState === 'copied' ? 'Copied!' : copyState === 'copying' ? 'Copying…' : 'Copy image'}</button>
      </div>
    </div>
    {!canCopy && <p className="fix-capture-notice">Image copying is unavailable in this browser. Use Download PNG.</p>}
    {error && <p className="fix-capture-error" role="alert">{error}</p>}
    <span className="sr-only" role="status">{copyState === 'copied' ? 'Image copied to clipboard.' : ''}</span>
    <div className="fix-capture-content fix-capture-preview" aria-busy={!image && !error}>
      {!image && !error && <p role="status">Preparing image…</p>}
      {image && <img src={image.url} alt={`${panelProps.title}, rows ${range[0] + 1} to ${range[1] + 1}`} />}
    </div>
    <div className="fix-capture-render" aria-hidden="true" inert>
      <FixMessagePanel {...panelProps} panelRef={panelRef} range={range} forceExpanded />
    </div>
  </>;
};

const MessageCapture = ({ rows, onClose, ...panelProps }) => {
  const dialogRef = useRef(null);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [preview, setPreview] = useState(false);
  const range = getCaptureRange(start, end, rows.length);
  const selectedRange = range || (start === null ? null : [start, start]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const release = lockDocumentScroll();
    dialog.showModal();
    return () => {
      dialog.close();
      release();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  const selectRow = index => {
    if (start === null || end !== null) {
      setStart(index);
      setEnd(null);
    } else {
      const [from, to] = getCaptureRange(start, index, rows.length);
      setStart(from);
      setEnd(to);
    }
  };

  const rowOptions = rows.map(row => <option key={row.rowIndex} value={row.rowIndex}>
    {row.rowIndex + 1}. {row.tag} {getTagName(row.tag, panelProps.tags)} — {String(row.value).slice(0, 70)}
  </option>);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="fix-capture-dialog"
      aria-labelledby="fix-capture-heading"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onKeyDown={event => event.stopPropagation()}
    >
      <header className="fix-capture-header">
        <div>
          <h2 id="fix-capture-heading">{preview ? 'Image preview' : 'Capture message'}</h2>
          <p>{preview ? 'Copy or download this image with your colors and highlights.' : 'Choose the first and last row. Both rows and everything between them are included.'}</p>
        </div>
        <button type="button" className="fix-capture-close" aria-label="Close image capture" onClick={onClose}><X size={20} /></button>
      </header>
      {preview ? <CapturePreview range={range} panelProps={panelProps} onBack={() => setPreview(false)} /> : <>
        <div className="fix-capture-toolbar">
          <label>From row<select aria-label="Capture from row" value={start ?? ''} onChange={event => setStart(event.target.value === '' ? null : Number(event.target.value))}><option value="">Choose first row</option>{rowOptions}</select></label>
          <label>Through row<select aria-label="Capture through row" value={end ?? ''} onChange={event => setEnd(event.target.value === '' ? null : Number(event.target.value))}><option value="">Choose last row</option>{rowOptions}</select></label>
          <div className="fix-capture-actions">
            <button type="button" onClick={() => { setStart(0); setEnd(rows.length - 1); }}>Whole message</button>
            <button type="button" className="fix-capture-primary" disabled={!range} onClick={() => setPreview(true)}><Camera size={15} /> Preview image</button>
          </div>
        </div>
        <p className="fix-capture-notice" role="status">
          {range ? `${range[1] - range[0] + 1} rows selected. Click a row to start a new range, or adjust the selectors above.` : start === null ? 'Click the first row to start, or choose Whole message.' : `Starting at row ${start + 1}. Click the last row (the same row captures just one field).`}
          {' '}Groups are expanded here so every occurrence is selectable.
        </p>
        <div className="fix-capture-content">
          <FixMessagePanel {...panelProps} forceExpanded capture={{ range: selectedRange, onSelect: selectRow }} />
        </div>
      </>}
    </dialog>, document.body,
  );
};

export default MessageCapture;
