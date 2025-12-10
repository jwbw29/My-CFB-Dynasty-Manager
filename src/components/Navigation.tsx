// src/components/Navigation.tsx
"use client";

import React, { memo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CoachProfile from "./CoachProfile";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { Home, Save, Menu, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface NavigationProps {
  onReturnToLaunch?: () => void;
  onManualSave?: () => void;
}

const Navigation: React.FC<NavigationProps> = memo(
  ({ onReturnToLaunch, onManualSave }) => {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleSaveAndExit = () => {
      // 1. Call the existing manual save function
      if (onManualSave) {
        onManualSave();
      }

      // 2. Execute the navigation function
      if (onReturnToLaunch) {
        onReturnToLaunch();
      }
    };

    const navItems = [
      { name: "Team Home", path: "/" },
      { name: "Schedule", path: "/schedule" },
      { name: "Top 25", path: "/top25" },
      { name: "User Teams", path: "/user-teams" },
      { name: "Roster", path: "/roster" },
      { name: "Recruiting", path: "/recruiting" },
      { name: "Transfers", path: "/transfers" },
      { name: "Stats & Records", path: "/team-stats" },
      // { name: 'Player Stats', path: '/player-stats' },
      { name: "Player Awards", path: "/awards" },
      { name: "Season History", path: "/records" },
      { name: "Trophy Case", path: "/trophy-case" },
      { name: "Social Media", path: "/social" },
      { name: "Tools", path: "/tools" },
    ];

    const NavLink = ({
      item,
      onClick,
    }: {
      item: (typeof navItems)[0];
      onClick?: () => void;
    }) => {
      const isActive = pathname
        ? item.path === "/"
          ? pathname === "/"
          : pathname.startsWith(item.path)
        : false;

      return (
        <Link
          href={item.path}
          onClick={onClick}
          className={`${
            isActive
              ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30"
              : "border-transparent text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          } inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-all duration-200 rounded-t-md`}
        >
          {item.name}
        </Link>
      );
    };

    return (
      <>
        <nav className="fixed top-0 left-0 right-0 z-50 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 flex justify-between items-center min-h-14 py-2">
            {/* Left Side - Home Button & Mobile Menu Toggle */}
            <div className="flex items-center gap-2 shrink-0">
            {onReturnToLaunch && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 h-9"
                    title="Return to Dynasty Selection"
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Return to Main Menu?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Would you like to save your current progress before
                      returning to the dynasty selection screen? Any unsaved
                      changes will be lost.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSaveAndExit}>
                      Save & Exit
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Mobile Menu Toggle - only show below md */}
            <Button
              id="menu-hamburger"
              variant="ghost"
              size="sm"
              className="md:hidden text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 h-9"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Center - Navigation Items (Horizontal Scroll on md+) */}
          <div className="hidden md:flex flex-1 overflow-x-auto scrollbar-hide px-2 mx-2">
            <div className="flex gap-1 items-center">
              {navItems.map((item) => (
                <NavLink key={item.name} item={item} />
              ))}
            </div>
          </div>

          {/* Right Side - Coach Profile, Save Button, Theme Toggle */}
          <div className="flex items-center gap-2 shrink-0 h-full">
            <div className="hidden sm:block h-full">
              <CoachProfile />
            </div>

            <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

            {onManualSave && (
              <>
                <Button
                  onClick={onManualSave}
                  variant="ghost"
                  size="sm"
                  className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 h-9"
                  title="Save Dynasty"
                >
                  <Save className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Save</span>
                </Button>

                <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              </>
            )}

            <ThemeToggle />
            </div>
          </div>

          {/* Mobile Menu Dropdown - only show below md */}
          <div
            className={`md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out overflow-hidden ${
              isMobileMenuOpen
                ? "max-h-[calc(100vh-3.5rem)] opacity-100"
                : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
              {navItems.map((item) => (
                <div key={item.name} className="w-full">
                  <NavLink
                    item={item}
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                </div>
              ))}

              {/* Mobile-only Coach Profile */}
              <div className="sm:hidden pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                <CoachProfile />
              </div>
            </div>
          </div>
        </nav>

        {/* Overlay for mobile menu */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/20 dark:bg-black/40 z-40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </>
    );
  }
);

Navigation.displayName = "Navigation";

export default Navigation;
