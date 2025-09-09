const LoadingSpinner = ({ size = "md", text = "Loading..." }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div
        className={`animate-spin rounded-full border-2 border-muted-foreground border-t-primary ${sizeClasses[size]} mb-2`}
      ></div>
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  )
}

export default LoadingSpinner
