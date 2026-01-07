var _kmailer_config = _kmailer_config || {
  api_token: "eyJhbGciOiJIUzUxMiJ9.eyJ1dWlkIjoiNjY5NzNmOWUtNTU4OC00ZjY1LTk0MmEtZGM4MGI5YmQ3NmE0In0.5mR-4ylkxTkMi_5nn9DoOVoNcnJspTfa97zBUpaNzXxshmozbEPVKjktYxrha3f64d4Ek_paUp1sblpCSqaW4w"
  ,endpoint: "https://mailer.kintoneapp.com"
  ,mailset_id: "faba51d5-b870-4f62-9046-0acca58cbacc"
};

(function (){
  'use strict';

  // ==========================================
  // 設定フラグ
  // ==========================================
  const ENABLE_MAIL_FUNCTION = false; // trueにするとメール機能(kMailer連携)が有効になります
  // ==========================================

  var load_cdn = function(){
    var component_elems = document.getElementsByClassName('kmailer-component');
    if(document.getElementById("toyokumo_kMailer_JS") === null
        || component_elems.length === 0
        || (component_elems.length === 1 && component_elems[0].children.length === 0)){
      kintone.proxy(
        "https://mailer.kintoneapp.com/api/version",
        "GET",
        {"Content-Type": "application/json"},
        {},
        function(body, status, _){
          var s, appjs, l, appcss, v;
          v = JSON.parse(body).version;
          appcss = document.createElement("link");
          appcss.type = "text/css";
          appcss.async = true;
          appcss.rel = "stylesheet";
          appcss.href = "https://mailer.kintoneapp.com/cdn/css/main.css?v=" + v;
          l = document.getElementsByTagName("link")[0];
          l.parentNode.insertBefore(appcss, l);
          appjs = document.createElement("script");
          appjs.type = "text/javascript";
          appjs.async = true;
          appjs.src = "https://mailer.kintoneapp.com/cdn/js/kmailer.js?v=" + v;
          appjs.id = "toyokumo_kMailer_JS";
          s = document.getElementsByTagName("script")[0];
          s.parentNode.insertBefore(appjs, s);
          _kmailer_config.version = v;
        },
        function(err){ console.log("Couldn't get current version"); }
      );
    }
  };

  var add_app_component = function(target_elm){
    if(target_elm.querySelectorAll(".kmailer-component").length === 0){
      var elm = document.createElement("div");
      elm.classList.add("kmailer-component");
      target_elm.appendChild(elm);
    }
  };

  var injectCustomButtonStyles = function(doc) {
    var styleId = 'kmailer-custom-button-style';
    if (doc.getElementById(styleId)) {
      return; 
    }

    var css = `
      .kmailer-mail-create-button {
        background-color: rgb(52, 132, 228) !important;
        color: rgb(255, 255, 255) !important;
        border: 1px solid rgb(52, 132, 228) !important;
        font-weight: bold !important;
        border-radius: 4px !important;
        transition: background-color 0.2s ease-in-out;
      }
      .kmailer-mail-create-button:hover {
        background-color: rgb(74, 144, 226) !important;
        border-color: rgb(74, 144, 226) !important;
      }
    `;

    var style = doc.createElement('style');
    style.id = styleId;
    style.type = 'text/css';
    style.appendChild(doc.createTextNode(css));
    doc.head.appendChild(style);
  };

  kintone.events.on('app.record.index.show', function(event){ return event; });

  kintone.events.on('app.record.detail.show', function(event){
    // メール機能が無効（false）の場合は、何もしないで終了
    if (!ENABLE_MAIL_FUNCTION) {
        console.log('メール送信機能は現在無効化されています(Version 1)');
        return event;
    }

    _kmailer_config.on_index = false;
    var headerSpace = kintone.app.record.getHeaderMenuSpaceElement();
    add_app_component(headerSpace);
    load_cdn();

    var modifyElements = function(doc) {
      injectCustomButtonStyles(doc);

      var elementsToHideByText = [
        { text: '自動送信の選択肢も表示する', container: '.field' },
        { text: 'フィールド一覧を隠す', container: '.field' },
        { text: 'フィールド一覧を隠す', container: '.ui.toggle.checkbox' },
        { text: '送信予約日時を指定する', container: '.field' },
        { text: 'HTMLメール', container: '.radio' },
        { text: 'テキストメール', container: 'label' }
      ];
      elementsToHideByText.forEach(function(target) {
        doc.querySelectorAll('label').forEach(function(label) {
          if (label.textContent.trim() === target.text) {
            var containerToHide = (target.container === 'label') ? label : label.closest(target.container);
            if (containerToHide && containerToHide.style.display !== 'none') {
              containerToHide.style.setProperty('display', 'none', 'important');
            }
          }
        });
      });
      
      var unsubscribeLink = doc.querySelector('.unsubscribe-link');
      if (unsubscribeLink && unsubscribeLink.style.display !== 'none') {
        unsubscribeLink.style.setProperty('display', 'none', 'important');
      }
      doc.querySelectorAll('.kmailer-component .ui.divider').forEach(function(divider) {
        if (divider.style.display !== 'none') {
            divider.style.setProperty('display', 'none', 'important');
        }
      });

      var buttons = doc.querySelectorAll('.kmailer-component button, .kmailer-component .button, .kintone-app-headermenu-space button');
      buttons.forEach(function(button) {
          var buttonText = button.textContent.trim();
          if (buttonText === 'メールを作成する') {
              // 表示
          } else if (buttonText.startsWith('予約済みメール') || 
                     buttonText === 'メール送信を予約する' ||
                     buttonText === 'その他の設定を行う') {
              if (button.style.display !== 'none') {
                  button.style.setProperty('display', 'none', 'important');
              }
          }
      });

      try {
        var record = kintone.app.record.get().record;
        var youkenValue = record['ご用件'].value;

        if (youkenValue) {
          var mapping = {
            '変更': 'メールテンプレ（変更/初診）',
            '取消': 'メールテンプレ（取消）',
            '初診': 'メールテンプレ（変更/初診）'
          };
          var targetOptionText = mapping[youkenValue];

          if (targetOptionText) {
            var optgroup = doc.querySelector('optgroup[label="手動で送信するテンプレート"]');
            if (optgroup) {
              var targetSelect = optgroup.closest('select.ui.simple.dropdown');
              if (targetSelect) {
                var options = Array.from(targetSelect.querySelectorAll('option'));
                var targetOption = options.find(function(opt) {
                  return opt.textContent.trim() === targetOptionText;
                });
                
                if (targetOption && targetSelect.value !== targetOption.value) {
                  targetSelect.value = targetOption.value;
                  targetSelect.dispatchEvent(new Event('change', { bubbles: true }));

                  setTimeout(function() {
                    var utilizeButton = Array.from(doc.querySelectorAll('.field a.button')).find(function(btn) {
                        return btn.textContent.trim() === '利用する';
                    });
                    if (utilizeButton) {
                        utilizeButton.click();
                        var templateSelectorDiv = doc.querySelector('.template-selector');
                        if (templateSelectorDiv) {
                            templateSelectorDiv.style.setProperty('display', 'none', 'important');
                        }
                    }
                  }, 100);
                }
              }
            }
          }
        }
      } catch (e) {
        // エラー無視
      }

      doc.querySelectorAll('.inline.fields').forEach(function(fieldGroup) {
        var label = fieldGroup.querySelector('label');
        if (label && label.textContent.trim() === '選択中のメールセット') {
            if (fieldGroup.style.display !== 'none') {
                fieldGroup.style.setProperty('display', 'none', 'important');
            }
        }
      });
    };

    var observer = new MutationObserver(function(mutations) {
      modifyElements(document);
      document.querySelectorAll('iframe').forEach(function(iframe) {
        try {
          var iframeDoc = iframe.contentWindow.document;
          modifyElements(iframeDoc);
        } catch (e) {
          // ignore cross-domain errors
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    return event;
  });

})();