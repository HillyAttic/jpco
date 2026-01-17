"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon, SettingsIcon, UserIcon } from "./icons";
import { useEnhancedAuth } from "@/contexts/enhanced-auth.context";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const auth = useEnhancedAuth();

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await auth.signOut();
      router.push('/auth/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
      setIsOpen(false);
    }
  };

  // Show loading state if auth is not ready
  if (auth.loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="max-[1024px]:sr-only">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Default user info if not authenticated
  const displayName = auth.userProfile?.displayName || auth.user?.email || "User";
  const displayEmail = auth.user?.email || "user@example.com";
  const userInitials = auth.getUserInitials ? auth.getUserInitials() : displayName.charAt(0).toUpperCase();
  const userRole = auth.getRoleDisplayName ? auth.getRoleDisplayName() : "User";

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">My Account</span>

        <figure className="flex items-center gap-3">
          {auth.userProfile?.photoURL ? (
            <Image
              src={auth.userProfile.photoURL}
              className="size-12 rounded-full object-cover"
              alt={`Avatar of ${displayName}`}
              role="presentation"
              width={48}
              height={48}
            />
          ) : (
            <div className="size-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
              {userInitials}
            </div>
          )}
          <figcaption className="flex items-center gap-1 font-medium text-dark dark:text-dark-6 max-[1024px]:sr-only">
            <span>{displayName}</span>

            <ChevronUpIcon
              aria-hidden
              className={cn(
                "rotate-180 transition-transform",
                isOpen && "rotate-0",
              )}
              strokeWidth={1.5}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem]"
        align="end"
      >
        <h2 className="sr-only">User information</h2>

        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          {auth.userProfile?.photoURL ? (
            <Image
              src={auth.userProfile.photoURL}
              className="size-12 rounded-full object-cover"
              alt={`Avatar for ${displayName}`}
              role="presentation"
              width={48}
              height={48}
            />
          ) : (
            <div className="size-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
              {userInitials}
            </div>
          )}

          <figcaption className="space-y-1 text-base font-medium">
            <div className="mb-2 leading-none text-dark dark:text-white">
              {displayName}
            </div>

            <div className="leading-none text-gray-6">{displayEmail}</div>
            
            <div className="text-xs text-primary font-medium">
              {userRole}
            </div>
          </figcaption>
        </figure>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6 [&>*]:cursor-pointer">
          <Link
            href={"/profile"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <UserIcon />

            <span className="mr-auto text-base font-medium">View profile</span>
          </Link>

          <Link
            href={"/pages/settings"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <SettingsIcon />

            <span className="mr-auto text-base font-medium">
              Account Settings
            </span>
          </Link>
        </div>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <LogOutIcon />

            <span className="text-base font-medium">
              {isSigningOut ? 'Signing out...' : 'Log out'}
            </span>
          </button>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
