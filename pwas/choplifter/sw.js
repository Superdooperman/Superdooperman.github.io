const CACHE = 'choplifter-v20';
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./js/main.js",
  "./js/audio.js",
  "./js/sprite-atlas.js",
  "./js/sprites.js",
  "./js/collision.js",
  "./js/motion.js",
  "./js/input.js",
  "./js/world.js",
  "./js/entities/projectile.js",
  "./js/entities/hostage.js",
  "./js/entities/tank.js",
  "./js/entities/jet.js",
  "./js/entities/bomber.js",
  "./js/entities/alien.js",
  "./js/entities/helicopter.js",
  "./js/scenes/hud.js",
  "./js/scenes/title.js",
  "./js/scenes/end.js",
  "./js/scenes/play.js",
  "./assets/sprites/alien.png",
  "./assets/sprites/base.png",
  "./assets/sprites/base_building.png",
  "./assets/sprites/base_flag_0.png",
  "./assets/sprites/base_flag_1.png",
  "./assets/sprites/base_flagpole.png",
  "./assets/sprites/base_grass_corner.png",
  "./assets/sprites/base_sidewalk_l.png",
  "./assets/sprites/base_sidewalk_r.png",
  "./assets/sprites/bomb.png",
  "./assets/sprites/bullet.png",
  "./assets/sprites/chopper_headon.png",
  "./assets/sprites/chopper_headon_rot_1.png",
  "./assets/sprites/chopper_headon_rot_2.png",
  "./assets/sprites/chopper_headon_rot_3.png",
  "./assets/sprites/chopper_headon_rot_4.png",
  "./assets/sprites/chopper_headon_squish.png",
  "./assets/sprites/chopper_side_0.png",
  "./assets/sprites/chopper_side_1.png",
  "./assets/sprites/chopper_side_10.png",
  "./assets/sprites/chopper_side_2.png",
  "./assets/sprites/chopper_side_3.png",
  "./assets/sprites/chopper_side_4.png",
  "./assets/sprites/chopper_side_5.png",
  "./assets/sprites/chopper_side_6.png",
  "./assets/sprites/chopper_side_7.png",
  "./assets/sprites/chopper_side_8.png",
  "./assets/sprites/chopper_side_9.png",
  "./assets/sprites/chopper_side_squish.png",
  "./assets/sprites/explosion_0.png",
  "./assets/sprites/explosion_1.png",
  "./assets/sprites/explosion_2.png",
  "./assets/sprites/hostage_load_0.png",
  "./assets/sprites/hostage_load_1.png",
  "./assets/sprites/hostage_run_0.png",
  "./assets/sprites/hostage_run_1.png",
  "./assets/sprites/hostage_run_2.png",
  "./assets/sprites/hostage_run_3.png",
  "./assets/sprites/hostage_wave_0.png",
  "./assets/sprites/hostage_wave_1.png",
  "./assets/sprites/hostage_wave_2.png",
  "./assets/sprites/house.png",
  "./assets/sprites/house_debris.png",
  "./assets/sprites/house_fire.png",
  "./assets/sprites/house_fire_0.png",
  "./assets/sprites/house_fire_1.png",
  "./assets/sprites/house_fire_body.png",
  "./assets/sprites/house_sill.png",
  "./assets/sprites/jet.png",
  "./assets/sprites/rotor_0.png",
  "./assets/sprites/rotor_1.png",
  "./assets/sprites/rotor_2.png",
  "./assets/sprites/tail_rotor_0.png",
  "./assets/sprites/tail_rotor_1.png",
  "./assets/sprites/tail_rotor_2.png",
  "./assets/sprites/tail_rotor_3.png",
  "./assets/sprites/tank_body.png",
  "./assets/sprites/tank_tread_0.png",
  "./assets/sprites/tank_tread_1.png"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});