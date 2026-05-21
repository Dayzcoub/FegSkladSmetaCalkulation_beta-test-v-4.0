(function () {
  'use strict';

  // CSS полностью перенесён в src/styles/main.css и подключается через
  // <link rel="stylesheet"> в index.html.
  // Этот модуль только регистрирует версию для инструментов разработки
  // и обратной совместимости с кодом который читает window.FEG_DESIGN_SYSTEM.

  window.FEG_DESIGN_SYSTEM = {
    version: '3.18.0',
    theme: 'linear-flat-dark',
    // refresh() оставлен как no-op для совместимости.
    // Модули которые вызывали FEG_DESIGN_SYSTEM.refresh() могут это делать
    // без ошибок — просто ничего не произойдёт.
    refresh: function () {},
  };
})();
