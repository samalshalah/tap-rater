/* File processing only. Input documents never become navigable URLs. */
const bitmapFormats = { tif:"TIFF", tiff:"TIFF", psd:"PSD", psb:"PSB", tga:"TGA", jp2:"JP2", j2k:"J2K", jxl:"JXL", ico:"ICO", bmp:"BMP", gif:"GIF", avif:"AVIF", pcx:"PCX", ppm:"PPM", pgm:"PGM", pbm:"PBM", dds:"DDS" };

async function renderDocument(bytes, postscript) {
  const {default: create} = await import("./vendor/gs.mjs");
  const gs = await create({locateFile: () => new URL("./vendor/gs.wasm", self.location.href).href, print:()=>{}, printErr:()=>{}});
  gs.FS.writeFile("input", bytes);
  const status = gs.callMain(["-dSAFER","-dBATCH","-dNOPAUSE","-dFirstPage=1","-dLastPage=1",
    postscript ? "-dEPSCrop" : "-dUseCropBox", "-r144", "-sDEVICE=pngalpha",
    "-dTextAlphaBits=4","-dGraphicsAlphaBits=4","-sOutputFile=proof.png","-f","input"]);
  if (status) throw Error("Document rendering failed");
  return new Blob([gs.FS.readFile("proof.png")], {type:"image/png"});
}

async function renderBitmap(bytes, format) {
  if (!Object.values(bitmapFormats).includes(format)) throw Error("Unsupported image");
  const { initializeImageMagick, ImageMagick, ResourceLimits, MagickReadSettings, MagickFormat } = await import("./vendor/magick.mjs");
  await initializeImageMagick(new URL("./vendor/magick.wasm",self.location.href));
  ResourceLimits.memory = 192n * 1024n * 1024n;
  ResourceLimits.disk = 0n;
  ResourceLimits.width = ResourceLimits.height = 24000n;
  const settings = new MagickReadSettings({format,frameIndex:0,frameCount:1});
  return ImageMagick.read(bytes, settings, image => {
    image.autoOrient();
    if (Math.max(image.width,image.height)>2400) image.resize(2400,2400);
    image.strip();
    return image.write(MagickFormat.Png, data => new Blob([data], {type:"image/png"}));
  });
}

self.onmessage = async ({data:{file}}) => {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const header = new TextDecoder("latin1").decode(bytes.subarray(0,1024));
    const ext = file.name.split(".").pop().toLowerCase();
    let blob;
    if (header.includes("%PDF-") || header.startsWith("%!") || ["pdf","ai","eps","ps"].includes(ext)) {
      blob = await renderDocument(bytes,!header.includes("%PDF-"));
    } else if ((header.slice(4,8)==="ftyp" && /hei[cfxs]|mif1|msf1|hevc|hevx/.test(header.slice(8,64))) || ["heic","heif"].includes(ext)) {
      const {heicTo} = await import("./vendor/heic.mjs");
      const bitmap = await heicTo({blob:file,type:"bitmap"});
      try {
        const scale = Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
        const canvas = new OffscreenCanvas(Math.max(1,Math.round(bitmap.width*scale)),Math.max(1,Math.round(bitmap.height*scale)));
        canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);
        blob = await canvas.convertToBlob({type:"image/png"});
      } finally { bitmap.close(); }
    } else {
      const format = header.startsWith("8BPS") ? "PSD" : /^(II\x2a\x00|MM\x00\x2a)/.test(header) ? "TIFF" : bitmapFormats[ext];
      blob = await renderBitmap(bytes,format);
    }
    self.postMessage({blob});
  } catch {
    self.postMessage({error:true});
  }
};
