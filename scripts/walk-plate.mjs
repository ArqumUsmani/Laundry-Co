// Step 1 of the walk-cycle pipeline: put each character on a flat green plate,
// with room around it for arm and leg swing, ready to be animated.
//   node scripts/walk-plate.mjs <rawDir> <outDir>
import sharp from 'sharp';

const [raw, out] = process.argv.slice(2);
for (const name of ['staff', 'woman', 'man']) {
  const figure = await sharp(`${raw}/${name}.png`).trim({ threshold: 8 }).resize({ height: 760 }).toBuffer();
  const { width } = await sharp(figure).metadata();
  await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#00b140' } })
    .composite([{ input: figure, top: 1024 - 760 - 90, left: Math.round((1024 - width) / 2) }])
    .png()
    .toFile(`${out}/${name}-green.png`);
}
