'use client';

import { useRef, useState } from 'react';
import { FileUp, Upload } from 'lucide-react';
import { useUploadDocument } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export function PdfUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = useUploadDocument();

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      return;
    }
    setError(null);
    upload.mutate(file, {
      onError: (err) => setError(err instanceof Error ? err.message : 'Upload failed'),
      onSettled: () => {
        if (inputRef.current) inputRef.current.value = '';
      },
    });
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!upload.isPending) openPicker();
          }
        }}
        onClick={() => {
          if (!upload.isPending) openPicker();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all',
          dragging
            ? 'border-primary bg-primary/5 scale-[1.01] shadow-inner'
            : 'border-input hover:border-primary/40 hover:bg-accent/50 bg-card/50',
          upload.isPending && 'pointer-events-none opacity-70',
        )}
      >
        <div
          className={cn(
            'mb-4 flex size-14 items-center justify-center rounded-2xl transition-colors',
            dragging ? 'bg-primary/15 text-primary' : 'bg-primary/10 text-primary',
          )}
        >
          {upload.isPending ? <Spinner className="size-6" /> : <Upload className="size-6" />}
        </div>

        <p className="text-sm font-medium">
          {upload.isPending ? 'Uploading your document…' : 'Drag & drop a compliance PDF here'}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          PDF only · Text-based documents work best
        </p>

        <Button
          variant="outline"
          className="mt-5"
          disabled={upload.isPending}
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
        >
          <FileUp className="size-4" />
          {upload.isPending ? 'Uploading…' : 'Choose file'}
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="text-destructive mt-3 text-sm">{error}</p>}
    </div>
  );
}
