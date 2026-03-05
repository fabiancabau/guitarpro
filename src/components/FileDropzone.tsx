import { useCallback, useRef, useState } from 'react';

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

export function FileDropzone({ onFileSelected, isLoading }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const accept = '.gp,.gpx,.gp3,.gp4,.gp5,.gp6,.gp7,.gp8';

  const onDropFile = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) {
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  return (
    <section className={`file-dropzone ${dragging ? 'file-dropzone--active' : ''}`}>
      <input
        ref={inputRef}
        className="file-dropzone__input"
        id="gp-file-input"
        type="file"
        accept={accept}
        disabled={isLoading}
        onChange={(event) => onDropFile(event.target.files)}
      />
      <label
        htmlFor="gp-file-input"
        className="file-dropzone__label"
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onDropFile(event.dataTransfer.files);
        }}
      >
        <span>Drop Guitar Pro files here or choose from device</span>
        <span className="file-dropzone__hint">Accepted: .gp, .gpx, .gp3-.gp8</span>
      </label>
      <button
        className="primary-button"
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Choose Guitar Pro file'}
      </button>
    </section>
  );
}
