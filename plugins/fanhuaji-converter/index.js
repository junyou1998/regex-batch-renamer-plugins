export default {
  async healthCheck(context) {
    try {
      const res = await context.httpGet('https://api.zhconvert.org/service-info');
      if (res && res.code === 0) {
        const count = res.data?.converters ? Object.keys(res.data.converters).length : 0;
        return {
          ok: true,
          message: `繁化姬 API 連線正常 (支援 ${count} 種轉換器)`
        };
      }
      return { ok: false, message: '繁化姬 API 回應非預期狀態' };
    } catch (err) {
      return { ok: false, message: err?.message || '無法連線至繁化姬 API (zhconvert.org)' };
    }
  },

  async transform(input, params, context) {
    if (!input || input.trim() === '') return input;
    
    let textToConvert = input;
    let ext = '';
    if (params.ignoreExtension !== false) {
      const lastDot = input.lastIndexOf('.');
      if (lastDot > 0) {
        textToConvert = input.substring(0, lastDot);
        ext = input.substring(lastDot);
      }
    }

    const converter = params.converter || 'Taiwan';
    const cacheKey = `zhconvert:${converter}:${textToConvert}`;
    const cached = context.cache?.get(cacheKey);
    if (cached !== undefined) {
      return cached + ext;
    }

    try {
      const res = await context.httpPost('https://api.zhconvert.org/convert', {
        text: textToConvert,
        converter: converter,
        ignore_mode: 0
      });

      if (res && res.data && res.data.text) {
        context.cache?.set(cacheKey, res.data.text, 300000);
        return res.data.text + ext;
      }
    } catch (err) {
      console.warn('Zhconvert convert error:', err);
    }
    return input;
  },

  async transformBatch(inputs, params, context) {
    if (!inputs || inputs.length === 0) return inputs;
    
    const converter = params.converter || 'Taiwan';
    const results = new Array(inputs.length);
    const uncachedIndexes = [];
    const uncachedTexts = [];
    const exts = new Array(inputs.length);

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      let textToConvert = input;
      let ext = '';
      if (params.ignoreExtension !== false) {
        const lastDot = input.lastIndexOf('.');
        if (lastDot > 0) {
          textToConvert = input.substring(0, lastDot);
          ext = input.substring(lastDot);
        }
      }
      exts[i] = ext;

      const cacheKey = `zhconvert:${converter}:${textToConvert}`;
      const cached = context.cache?.get(cacheKey);
      if (cached !== undefined) {
        results[i] = cached + ext;
      } else {
        uncachedIndexes.push(i);
        uncachedTexts.push(textToConvert);
      }
    }

    if (uncachedTexts.length > 0) {
      const joined = uncachedTexts.join('\n');
      try {
        const res = await context.httpPost('https://api.zhconvert.org/convert', {
          text: joined,
          converter: converter,
          ignore_mode: 0
        });

        if (res && res.data && res.data.text) {
          const convertedList = res.data.text.split('\n');
          for (let k = 0; k < uncachedIndexes.length; k++) {
            const originalIndex = uncachedIndexes[k];
            const convertedText = convertedList[k] !== undefined ? convertedList[k] : uncachedTexts[k];
            const cacheKey = `zhconvert:${converter}:${uncachedTexts[k]}`;
            context.cache?.set(cacheKey, convertedText, 300000);
            results[originalIndex] = convertedText + exts[originalIndex];
          }
        } else {
          for (let k = 0; k < uncachedIndexes.length; k++) {
            results[uncachedIndexes[k]] = inputs[uncachedIndexes[k]];
          }
        }
      } catch (err) {
        console.warn('Zhconvert batch convert error:', err);
        for (let k = 0; k < uncachedIndexes.length; k++) {
          results[uncachedIndexes[k]] = inputs[uncachedIndexes[k]];
        }
      }
    }

    return results;
  }
};
