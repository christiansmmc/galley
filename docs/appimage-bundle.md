# AppImage bundling

`pnpm tauri build` produces the `.deb` and `.rpm` bundles cleanly, but the
AppImage step shells out to `linuxdeploy`, which in turn runs the host's
`strip` over every `.so` it pulls in. On modern Fedora / Nobara hosts the
shipped libraries (webkit2gtk, libxml2, libzstd, …) use the newer
`SHT_RELR` (`.relr.dyn`) section. The `strip` bundled inside the
linuxdeploy AppImage doesn't recognise that section type and aborts:

```
ERROR: Strip call failed: ... unknown type [0x13] section `.relr.dyn'
... Unable to recognise the format of the input file ...
failed to bundle project `failed to run linuxdeploy`
```

## Workaround

Set `NO_STRIP=true` before invoking the bundle step. linuxdeploy then
skips the strip pass entirely:

```bash
NO_STRIP=true pnpm tauri build --bundles appimage
```

The resulting AppImage is ~10–20 MB larger than a stripped one, but it
boots and runs identically. Verified locally: produced
`PR Reviewer_0.1.0_amd64.AppImage` (~105 MB).

## When to revisit

- Upstream linuxdeploy is tracking a fix; once it ships, drop the env
  var and let `strip` run again.
- If we ever build inside a CI image with an older glibc / binutils, the
  problem disappears on its own.

## Caveat

`NO_STRIP=true` only affects the AppImage path. The deb / rpm bundles
already build fine without it.
