import { NavLink } from 'react-router-dom'
import './Nav.css'

/** Persistent top navbar — same pattern as the sibling apps: brand links to the splash page,
 * one top-level link for the operational page. */
export default function Nav() {
  return (
    <nav className="sm-nav">
      <NavLink to="/about" className="sm-nav__brand">
        Scan Me
      </NavLink>
      <div className="sm-nav__links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `sm-nav__link ${isActive ? 'sm-nav__link--active' : ''}`}
        >
          Scans
        </NavLink>
      </div>
    </nav>
  )
}
