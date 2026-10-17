// Tipos para importar imagens (o next-env.d.ts não vai para o GitHub, então declaramos aqui).
declare module "*.webp" {
  const img: import("next/image").StaticImageData;
  export default img;
}
declare module "*.png" {
  const img: import("next/image").StaticImageData;
  export default img;
}
