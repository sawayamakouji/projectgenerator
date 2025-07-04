
export const formatDate = (dateString: string): string => {
  if (!dateString) return '未設定';
  try {
    const date = new Date(dateString);
    // UTC日付として解釈し、ユーザーのタイムゾーンオフセットを考慮せずに日付部分のみを使用
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth(); // 0-indexed
    const day = date.getUTCDate();
    
    // YYYY年M月D日の形式で表示
    // 日本語ロケールではmonth+1が通常
    return new Date(year, month, day).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.warn(`日付フォーマットエラー: ${dateString}`, error);
    return dateString; // フォーマット失敗時は元の文字列を返す
  }
};

export const parseDate = (dateString: string): Date => {
  // YYYY-MM-DD形式を想定
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScriptの月は0から始まる
    const day = parseInt(parts[2], 10);
    // ローカルタイムゾーンではなくUTCとして日付を作成することで、タイムゾーンによる日付のずれを防ぐ
    return new Date(Date.UTC(year, month, day));
  }
  // 不正な形式の場合は、標準のDateコンストラクタにフォールバック（推奨されませんが、エラーよりはマシ）
  console.warn(`parseDate: 不正な日付形式です: ${dateString}. UTCとして解析を試みます。`);
  const d = new Date(dateString); // これはローカルタイムゾーンで解釈される可能性がある
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); // UTCに変換
};

export const getDaysBetweenDates = (startDateStr: string, endDateStr: string): number => {
  const startDate = parseDate(startDateStr);
  const endDate = parseDate(endDateStr);
  const differenceInTime = endDate.getTime() - startDate.getTime();
  // 日数差、開始日と終了日両方を含むため+1
  return Math.round(differenceInTime / (1000 * 3600 * 24)) + 1; 
};

// 2つの日付オブジェクト間の差を日数で返す (date2 - date1)
export const getDifferenceInDays = (date1: Date, date2: Date): number => {
  const differenceInTime = date2.getTime() - date1.getTime();
  return Math.ceil(differenceInTime / (1000 * 3600 * 24));
};

export const addDays = (dateStr: string, days: number): string => {
  const date = parseDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days); // UTCで日付を加算
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // 月は0から始まる
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDayOfWeek = (dateStr: string, short: boolean = false): string => {
  const date = parseDate(dateStr);
  const options: Intl.DateTimeFormatOptions = { weekday: short ? 'short' : 'long', timeZone: 'UTC' };
  return date.toLocaleDateString('ja-JP', options);
};

export const getMonthAndDay = (dateStr: string): string => {
    const date = parseDate(dateStr);
    // 日本語の場合、'M月D日'のような形式が一般的
    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', timeZone: 'UTC' });
};

export const getWeekNumber = (dateStr: string): number => {
  const date = parseDate(dateStr);
  const firstDayOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
};

export const isWeekend = (dateStr: string): boolean => {
    const date = parseDate(dateStr);
    const day = date.getUTCDay(); // 0 (日曜日) または 6 (土曜日) in UTC
    return day === 0 || day === 6;
};
