'use client';

import { useRef, useState } from 'react';
import { Download, File as FileIcon, FolderPlus, Link2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet, apiPost, uploadFile } from '@/lib/api';
import type { FileItem, FolderItem } from '@/lib/types';

function formatSize(size: string): string {
  const bytes = Number(size);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [folderDialog, setFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [shareLink, setShareLink] = useState<string | null>(null);

  const { data: files = [], mutate: mutateFiles } = useSWR<FileItem[]>('files', () =>
    apiGet<FileItem[]>('/api/files'),
  );
  const { data: folders = [], mutate: mutateFolders } = useSWR<FolderItem[]>('folders', () =>
    apiGet<FolderItem[]>('/api/files/folders'),
  );

  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadFile('/api/files/upload', file);
      toast.success(`${file.name} uploaded`);
      await mutateFiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  async function createFolder() {
    try {
      await apiPost('/api/files/folders', { name: folderName });
      setFolderName('');
      setFolderDialog(false);
      await mutateFolders();
      toast.success('Folder created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create folder');
    }
  }

  async function createShareLink(fileId: string) {
    try {
      const result = await apiPost<{ link: string }>(`/api/files/${fileId}/share-link`, {
        permission: 'view',
        expiresInHours: 168,
      });
      setShareLink(result.link);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create link');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Files</h1>
          <p className="text-sm text-muted-foreground">Company drive with folders and share links</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setFolderDialog(true)}>
            <FolderPlus className="mr-2 h-4 w-4" /> New folder
          </Button>
          <Button onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
          <input ref={inputRef} type="file" className="hidden" onChange={onUpload} />
        </div>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {folders.map((folder) => (
              <TableRow key={folder.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <FolderPlus className="h-4 w-4 text-amber-500" /> {folder.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(folder.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell />
              </TableRow>
            ))}
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <FileIcon className="h-4 w-4 text-indigo-500" /> {file.originalName}
                    {Number(file.size) === 0 && <Badge variant="secondary">stub</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatSize(file.size)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(file.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => void createShareLink(file.id)}
                      title="Share link"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                    <a href={`/api/files/${file.id}/download`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Download">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {files.length === 0 && folders.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  No files yet — upload your first document
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={folderDialog} onOpenChange={setFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>Organize your team&apos;s files.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Folder name</Label>
            <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Design assets" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialog(false)}>Cancel</Button>
            <Button onClick={createFolder} disabled={!folderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareLink !== null} onOpenChange={(open) => !open && setShareLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share link created</DialogTitle>
            <DialogDescription>Anyone with this link can view the file until it expires (7 days).</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={shareLink ?? ''} />
            <Button
              variant="secondary"
              onClick={() => {
                if (shareLink) {
                  void navigator.clipboard.writeText(shareLink);
                  toast.success('Link copied');
                }
              }}
            >
              Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
