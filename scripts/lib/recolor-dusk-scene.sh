#!/usr/bin/env bash
# Recolours a Studio Pals scene to dusk for dark mode. Used to produce public/illustrations/quiet-set/*-dusk*.webp; see docs/design/provenance/quiet-set/.
# Usage: recolor-dusk-scene.sh <in.webp> <out.png> [windowBottom=0.47] [windowLeft=0.55]. Needs ffmpeg; encode the PNG with cwebp.
in=$1; out=$2; WB=${3:-0.47}; WL=${4:-0.55}
WIN="lt(Y,H*$WB)*gt(X,W*$WL)"
# sky weight: how much bluer than red/green, how light, and not the dark teal trim
SW="clip((b(X,Y)-max(r(X,Y),g(X,Y))-4)/26,0,1)*clip((b(X,Y)-150)/45,0,1)*clip((r(X,Y)-80)/30,0,1)*$WIN"
LW="clip((g(X,Y)-max(r(X,Y),b(X,Y))-8)/20,0,1)*$WIN"
T="(Y/(H*$WB))"
SR="(78+(170-78)*$T)*(0.78+0.22*r(X,Y)/255)"; SG="(64+(128-64)*$T)*(0.78+0.22*g(X,Y)/255)"; SB="(126+(180-126)*$T)*(0.82+0.18*b(X,Y)/255)"
ffmpeg -loglevel error -y -i "$in" -vf "format=rgb24,geq=\
r='r(X,Y)*(1-$SW)+$SR*$SW - r(X,Y)*0.42*$LW':\
g='g(X,Y)*(1-$SW)+$SG*$SW - g(X,Y)*0.38*$LW':\
b='b(X,Y)*(1-$SW)+$SB*$SW - (b(X,Y)*0.2-18)*$LW',\
curves=r='0/0 0.5/0.47 1/0.96':g='0/0 0.5/0.45 1/0.93':b='0/0.02 0.5/0.45 1/0.91'" "$out"
