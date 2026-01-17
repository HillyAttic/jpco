"use client";
import { EmailIcon, PasswordIcon } from "@/assets/icons";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import InputGroup from "../FormElements/InputGroup";
import { Checkbox } from "../FormElements/checkbox";
import { useEnhancedAuth } from "@/contexts/enhanced-auth.context";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { roleManagementService } from "@/services/role-management.service";

export default function SigninWithPassword() {
  const router = useRouter();
  const { signIn, user } = useEnhancedAuth();
  
  const [data, setData] = useState({
    email: "admin@gmail.com", // Default test admin email
    password: "admin@123", // Default test admin password
    remember: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Create test admin user if it doesn't exist
  const createTestAdminUser = async () => {
    try {
      console.log('Creating test admin user...');
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        "admin@gmail.com", 
        "admin@123"
      );

      // Create admin profile in Firestore
      await roleManagementService.createUserProfile(userCredential.user.uid, {
        email: "admin@gmail.com",
        displayName: "Test Admin",
        role: "admin",
        department: "IT",
        createdBy: userCredential.user.uid,
      });

      console.log('Test admin user created successfully');
      return userCredential.user;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('Test admin user already exists');
        return null; // User already exists, this is fine
      }
      console.error('Error creating test admin user:', error);
      throw error;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // First, try to sign in
      const result = await signIn(data.email, data.password);
      
      if (result.success) {
        console.log('Sign in successful');
        router.push('/dashboard');
      } else {
        // If sign in fails and it's the test admin credentials, try to create the user
        if (data.email === "admin@gmail.com" && data.password === "admin@123") {
          console.log('Test admin sign in failed, attempting to create user...');
          await createTestAdminUser();
          
          // Try signing in again after creating the user
          const retryResult = await signIn(data.email, data.password);
          if (retryResult.success) {
            console.log('Sign in successful after creating test admin');
            router.push('/dashboard');
          } else {
            setError(retryResult.error || 'Failed to sign in after creating test admin user');
          }
        } else {
          setError(result.error || 'Sign in failed');
        }
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex">
            <div className="text-red-800 text-sm">
              {error}
            </div>
          </div>
        </div>
      )}

      <InputGroup
        type="email"
        label="Email"
        className="mb-4 [&_input]:py-[15px]"
        placeholder="Enter your email"
        name="email"
        handleChange={handleChange}
        value={data.email}
        icon={<EmailIcon />}
        required
      />

      <InputGroup
        type="password"
        label="Password"
        className="mb-5 [&_input]:py-[15px]"
        placeholder="Enter your password"
        name="password"
        handleChange={handleChange}
        value={data.password}
        icon={<PasswordIcon />}
        required
      />

      <div className="mb-6 flex items-center justify-between gap-2 py-2 font-medium">
        <Checkbox
          label="Remember me"
          name="remember"
          withIcon="check"
          minimal
          radius="md"
          onChange={(e) =>
            setData({
              ...data,
              remember: e.target.checked,
            })
          }
        />

        <Link
          href="/auth/forgot-password"
          className="hover:text-primary dark:text-white dark:hover:text-primary"
        >
          Forgot Password?
        </Link>
      </div>

      <div className="mb-4.5">
        <button
          type="submit"
          disabled={loading}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary p-4 font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing In...' : 'Sign In'}
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
          )}
        </button>
      </div>

      {/* Test credentials info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm text-blue-800">
          <strong>Test Admin Credentials:</strong>
          <br />
          Email: admin@gmail.com
          <br />
          Password: admin@123
        </div>
      </div>
    </form>
  );
}
