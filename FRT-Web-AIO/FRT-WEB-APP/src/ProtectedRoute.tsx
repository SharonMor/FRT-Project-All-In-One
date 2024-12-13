import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useUser from './hooks/useUser';
import Spinner from './components/spinner/Spinner';

interface ProtectedRouteProps {
  authenticationRequired: boolean;
  redirectPath: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ authenticationRequired, redirectPath }) => {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="spinner-container">
        <Spinner />
      </div>
    );
  }

  if (authenticationRequired && !user) {
    return <Navigate to={redirectPath} replace />;
  }

  if (!authenticationRequired && user) {
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;