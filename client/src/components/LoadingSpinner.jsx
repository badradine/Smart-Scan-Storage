function LoadingSpinner({ fullScreen = false, text = 'Загрузка...' }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="loading-spinner w-10 h-10"></div>
      {text && <p className="text-gray-500">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
}

export default LoadingSpinner;
