import { Plus } from "lucide-react"
import { Link } from "react-router-dom"

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionText = "Get Started",
  actionLink = "/create",
  showAction = true,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-muted rounded-full p-4 mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="font-heading font-semibold text-xl text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-md">{description}</p>
      {showAction && (
        <Link
          to={actionLink}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium transition-colors flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          {actionText}
        </Link>
      )}
    </div>
  )
}

export default EmptyState
