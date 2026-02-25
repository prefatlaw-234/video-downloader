"use client";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Download, Music, Video } from 'lucide-react'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import axios from 'axios';
import { useState } from 'react';

// Aqui va la Interfaz
interface DownloadItem {
  url: string;
  format: 'mp4' | 'mp3';
}

export default function Downloader() {
  const [items, setItems] = useState<DownloadItem[]>([{ url: '', format: 'mp4' }]); 
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);

  const MAX_LINKS = 5;

  const addUrlField = () => {
    if (items.length < MAX_LINKS) {
      setItems([...items, { url: '', format: 'mp4' }]);
    }
  };

  const removeUrlField = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.length ? newItems : [{ url: '', format: 'mp4' }]);
  };

  const updateItem = (index: number, key: keyof DownloadItem, val: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: val };
    setItems(newItems);
  };

  const handleDownloadAll = async () => {
    setLoading(true);
    setErrors([]);
    
    const activeItems = items.filter(item => item.url.trim() !== '');

    for (const item of activeItems) {
      try {
        const res = await axios.get(`http://localhost:8000/download`, {
          params: { 
            url: item.url,
            format_type: item.format // Se envia el formato al backend
          },
          responseType: 'blob',
        });

        const contentDisposition = res.headers['content-disposition'];
        let fileName = item.format === 'mp3' ? 'audio.mp3' : 'video.mp4';

        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i);
          if (fileNameMatch && fileNameMatch[1]) {
            fileName = decodeURIComponent(fileNameMatch[1]);
          }
        }

        const urlBlob = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = urlBlob;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(urlBlob);
      } catch (err: any) {
        setErrors(prev => [...prev, `Error en: ${item.url.substring(0, 20)}...`]);
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center p-10 bg-slate-50 min-h-screen text-slate-900">
      <div className="w-full max-w-3xl bg-white p-8 rounded-xl shadow-sm border">
        <h1 className="text-3xl font-extrabold mb-2 text-center tracking-tight text-black">YouTube, Instagram, Facebook Downloader</h1>
        <p className="text-muted-foreground text-center mb-8">Elige el formato y descarga múltiples videos</p>

        <div className="space-y-4 mb-6">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-center">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="https://youtube.com/watch?v=..."
                  value={item.url}
                  onChange={(e) => updateItem(index, 'url', e.target.value)}
                />
              </div>
              
              <Select 
                value={item.format} 
                onValueChange={(val: 'mp4' | 'mp3') => updateItem(index, 'format', val)}
              >
                <SelectTrigger className="w-27.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">
                    <div className="flex items-center"><Video className="w-4 h-4 mr-2" /> MP4</div>
                  </SelectItem>
                  <SelectItem value="mp3">
                    <div className="flex items-center"><Music className="w-4 h-4 mr-2" /> MP3</div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {items.length > 1 && (
                <Button variant="outline" size="icon" onClick={() => removeUrlField(index)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          
          {items.length < MAX_LINKS && (
            <Button 
              variant="ghost" 
              className="w-full border-dashed border-2 h-12 text-slate-500" 
              onClick={addUrlField}
            >
              <Plus className="mr-2 h-4 w-4" /> Añadir otro link
            </Button>
          )}
        </div>

        {errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            {errors.map((err, i) => <p key={i} className="text-red-600 text-xs font-medium">{err}</p>)}
          </div>
        )}

        <Button
          onClick={handleDownloadAll}
          disabled={loading || items.every(i => !i.url)}
          className="w-full h-12 text-lg font-semibold bg-slate-900 hover:bg-slate-800"
        >
          {loading ? (
            <span className="flex items-center"><Download className="mr-2 animate-bounce" /> Descargando cola...</span>
          ) : (
            `Descargar ${items.filter(i => i.url).length} archivo(s)`
          )}
        </Button>
      </div>
    </div>
  );
}