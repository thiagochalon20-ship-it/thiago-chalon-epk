const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const archiver = require('archiver');

const SOURCE_DIR = path.join(__dirname, '../source-photos');
const DEST_DIR = path.join(__dirname, '../img/galeria');
const JS_DATA_FILE = path.join(__dirname, '../js/galeria-data.js');
const ZIP_FILE = path.join(__dirname, '../galeria-roma-prensa.zip');

async function buildGallery() {
    console.log('--- Iniciando optimización de galería ---');

    // 1. Asegurar que source-photos existe
    if (!fs.existsSync(SOURCE_DIR)) {
        fs.mkdirSync(SOURCE_DIR, { recursive: true });
        console.log('Carpeta source-photos creada. Por favor, agregá tus fotos ahí y volvé a correr el script.');
        return;
    }

    // 2. Limpiar/Crear img/galeria (Idempotencia)
    if (fs.existsSync(DEST_DIR)) {
        console.log('Limpiando img/galeria/ para evitar archivos huérfanos...');
        fs.rmSync(DEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DEST_DIR, { recursive: true });

    const files = fs.readdirSync(SOURCE_DIR).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext);
    });

    if (files.length === 0) {
        console.log('No se encontraron imágenes en source-photos/.');
        return;
    }

    console.log(`Encontradas ${files.length} fotos. Procesando (Miniaturas: 600px, Full: 2000px)...`);

    const galeriaData = [];
    const processedNames = new Set();

    // Preparar ZIP
    const output = fs.createWriteStream(ZIP_FILE);
    const archive = archiver('zip', {
        zlib: { level: 9 } // Máxima compresión para el zip
    });

    output.on('close', function() {
        console.log(`\nZIP para prensa generado: ${archive.pointer()} bytes totales.`);
        console.log('--- Proceso finalizado con éxito ---');
    });

    archive.on('error', function(err) {
        throw err;
    });

    archive.pipe(output);

    // 3. Procesar cada imagen
    let counter = 1;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const srcPath = path.join(SOURCE_DIR, file);
        const baseName = path.parse(file).name;
        
        // --- DEDUPLICACIÓN ---
        // Extraer el nombre base real eliminando " - copia" o similares
        const cleanName = baseName.replace(/[\s_]*-[\s_]*copia.*$/i, '').replace(/___copia.*$/i, '').trim();
        
        if (processedNames.has(cleanName)) {
            // Saltamos la imagen porque ya procesamos el original (o una copia idéntica)
            continue;
        }
        processedNames.add(cleanName);

        // Nombres limpios originales
        const safeName = cleanName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        // Slug SEO genérico seguro
        const slug = `thiago-chalon-roma-oficial-${counter}`;
        const altText = "Thiago Chalon - Roma - 2026";
        counter++;
        
        const thumbName = `thumb_${slug}.webp`;
        const fullName = `full_${slug}.webp`;
        
        const thumbPath = path.join(DEST_DIR, thumbName);
        const fullPath = path.join(DEST_DIR, fullName);

        // Configuración de edición estética
        const applyEdits = (img) => {
            const desaturatedPhotos = ['thiago_282', 'thiago_199', 'thiago_206'];
            
            // Si es una de las fotos especiales, bajar saturación 5% (-5 puntos = 0.95)
            if (desaturatedPhotos.includes(safeName)) {
                return img.modulate({ saturation: 0.95 });
            }
            
            // Para el resto: +12% saturación y toque de calidez
            return img.modulate({ saturation: 1.12 })
                      .recomb([
                          [1.04, 0.0, 0.0],  // Leve aumento de rojos
                          [0.0, 1.01, 0.0],  // Micro ajuste de verdes
                          [0.0, 0.0, 0.96]   // Leve reducción de azules (aporta calidez general)
                      ]);
        };

        // Generar thumb
        await applyEdits(sharp(srcPath))
            .resize({ width: 600, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(thumbPath);

        // Generar full
        await applyEdits(sharp(srcPath))
            .resize({ width: 2000, withoutEnlargement: true })
            .webp({ quality: 90 })
            .toFile(fullPath);

        // Agregar archivo ORIGINAL al ZIP de prensa (para que tengan la máxima calidad posible)
        archive.file(srcPath, { name: `Roma_Prensa/${slug}.jpg` });

        // Agregar al array para el front-end
        galeriaData.push({
            thumb: `img/galeria/${thumbName}`,
            full: `img/galeria/${fullName}`,
            alt: altText
        });

        process.stdout.write(`\rProcesadas: ${i + 1}/${files.length}`);
    }
    console.log(''); // Nueva línea después del progreso

    // Finalizar ZIP
    await archive.finalize();

    // 4. Generar js/galeria-data.js
    const jsContent = `// Generado automáticamente por scripts/build-gallery.js
const galeriaData = ${JSON.stringify(galeriaData, null, 4)};
`;
    if (!fs.existsSync(path.dirname(JS_DATA_FILE))) {
        fs.mkdirSync(path.dirname(JS_DATA_FILE), { recursive: true });
    }
    fs.writeFileSync(JS_DATA_FILE, jsContent);
    console.log('Generado js/galeria-data.js con éxito.');
}

buildGallery().catch(err => {
    console.error('Error durante la construcción:', err);
});
