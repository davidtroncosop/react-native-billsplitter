# Use a Node.js base image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Install Java and Android SDK
RUN apt-get update && apt-get install -y openjdk-17-jdk
RUN apt-get install -y wget unzip
RUN wget https://dl.google.com/android/repository/commandlinetools-linux-10406996_latest.zip -O android-sdk.zip
RUN mkdir -p /opt/android-sdk && unzip android-sdk.zip -d /opt/android-sdk
ENV ANDROID_HOME=/opt/android-sdk/cmdline-tools
ENV PATH="$PATH:${ANDROID_HOME}/bin"
RUN yes | sdkmanager --sdk_root=/opt/android-sdk "platforms;android-33" "build-tools;33.0.2" "cmdline-tools;latest"
RUN yes | sdkmanager --sdk_root=/opt/android-sdk "system-images;android-33;google_apis_playstore;x86_64"

# Set environment variables for React Native
ENV JAVA_HOME=/usr/lib/jvm/java-1.17.0-openjdk-amd64
ENV GRADLE_USER_HOME=/app/.gradle

# Install react-native-builder-bob for building .aab
RUN npm install -g react-native-builder-bob

# Expose port for the app (if needed)
# EXPOSE 8081

# Command to build the Android app
CMD ["npm", "run", "android", "--", "--variant", "release", "--bundle"]
