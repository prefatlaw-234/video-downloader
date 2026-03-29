#Aqui van las importaciones
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import urllib.parse 
import yt_dlp
import os
import uuid
import os
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks

#Aqui se inicializa la app

app = FastAPI()


#Aqui van las cors

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

#Funcion para eliminar un archivo

def remove_file(path: str):
    if os.path.exists(path):
        os.remove(path)

#Ruta para descargar videos

@app.get("/download")
async def download_video(
    url: str, #Parametros
    background_tasks: BackgroundTasks,
    format_type: str = Query("mp4", enum=["mp4", "mp3"]),  
):
    #Generar ID
    
    download_id = str(uuid.uuid4())
    
    
    #Crear carpeta en el caso de que no exista
    
    if not os.path.exists("downloads"):
        os.makedirs("downloads")

    #Inicializar el video
    
    temp_path = os.path.join("downloads", f"{download_id}.%(ext)s")
    
    try:
        with yt_dlp.YoutubeDL({
            'quiet': True, 
            'no_warnings': True,
            'cookiefile': 'cookies.txt'
            }) as ydl:
            info = ydl.extract_info(url, download=False)
            filename = info.get('title') or info.get('url') or 'video.mp4'
            print(filename)
        if format_type == "mp3":
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': temp_path,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
            }
        else:
            ydl_opts = {
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                'outtmpl': temp_path,
                'merge_output_format': 'mp4',
                'cookiefile': 'cookies.txt',
            }
        ydl_opts.update({'quiet': True, 'noplaylist': True})

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            real_filename = ydl.prepare_filename(info_dict)
            
            if not os.path.exists(real_filename):
                base = os.path.splitext(real_filename)[0]
                if os.path.exists(f"{base}.{format_type}"):
                    real_filename = f"{base}.{format_type}"

        friendly_name = f"{info_dict.get('title')}.{format_type}"
        
        friendly_name = "".join([c for c in friendly_name if c.isalnum() or c in (' ', '.', '_', '-')]).strip()

        background_tasks.add_task(remove_file, real_filename)

        encoded_filename = urllib.parse.quote(friendly_name)
        return FileResponse(
            path=real_filename, 
            filename=friendly_name, 
            media_type='video/mp4',
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
            }
        )

    except Exception as e:
        print(f"Error detectado: {str(e)}") 
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

if __name__ == "__main__":
    if not os.path.exists("downloads"):
        os.makedirs("downloads")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
