"""Собирает docs/index.html: страницу игры в полном HTML-документе с подключением PWA (манифест, сервис-воркер, иконки)."""
import os
here = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(here, 'kvantovaya-saga-dolina.html'), encoding='utf8').read()
head = ('<!doctype html><html lang="ru"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="theme-color" content="#1c1b20">'
        '<meta name="apple-mobile-web-app-capable" content="yes">'
        '<meta name="mobile-web-app-capable" content="yes">'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
        '<meta name="apple-mobile-web-app-title" content="Конспект">'
        '<link rel="manifest" href="manifest.webmanifest">'
        '<link rel="icon" type="image/png" href="icons/icon-192.png">'
        '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">'
        '<style>:root{color-scheme:dark;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);'
        'padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}'
        '[hidden]{display:none!important}</style></head><body>\n')
tail = ('\n<script>if("serviceWorker" in navigator)addEventListener("load",()=>'
        'navigator.serviceWorker.register("sw.js").catch(()=>{}));</script>\n</body></html>\n')
out = os.path.join(here, '..', 'docs', 'index.html')
open(out, 'w', encoding='utf8').write(head + page + tail)
print('docs/index.html', os.path.getsize(out), 'байт')
