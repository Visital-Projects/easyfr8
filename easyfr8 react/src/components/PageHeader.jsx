// Reusable page header/banner used on all inner pages
export default function PageHeader({ title, subtitle }) {
  return (
    <div className="page-header parallax" style={{ backgroundImage: 'url(/src/assets/images/bg/page-header-bg.jpg)' }}>
      <div className="container">
        <div className="page-header-inner">
          <div className="fh-section-title clearfix text-left version-light">
            <h2>{title}</h2>
          </div>
          {subtitle && (
            <div className="pagehead-nav">
              <a href="/">Home</a> / {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
