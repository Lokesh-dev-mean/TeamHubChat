import React from 'react';

interface UserStatusIndicatorProps {
  status: 'Online' | 'Away' | 'Busy' | 'Offline';
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const UserStatusIndicator: React.FC<UserStatusIndicatorProps> = ({ 
  status, 
  size = 'medium', 
  showText = false 
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'Online':
        return 'bg-green-500';
      case 'Away':
        return 'bg-yellow-500';
      case 'Busy':
        return 'bg-red-500';
      case 'Offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'Online':
        return 'Online';
      case 'Away':
        return 'Away';
      case 'Busy':
        return 'Busy';
      case 'Offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-2 h-2';
      case 'medium':
        return 'w-3 h-3';
      case 'large':
        return 'w-4 h-4';
      default:
        return 'w-3 h-3';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`${getStatusColor()} ${getSizeClasses()} rounded-full border-2 border-white shadow-sm`}
        title={getStatusText()}
      />
      {showText && (
        <span className="text-sm text-gray-600 font-medium">
          {getStatusText()}
        </span>
      )}
    </div>
  );
};

export default UserStatusIndicator;
