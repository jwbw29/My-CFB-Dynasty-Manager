// src/components/RecruitingClassTracker.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useDynasty } from '@/contexts/DynastyContext';
import { capitalizeName } from '@/utils';
import { Recruit } from '@/types/playerTypes';
import { generalPositions } from '@/types/playerTypes';
import { notifySuccess, notifyError, MESSAGES } from '@/utils/notification-utils';
import { Pencil, Trash2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

interface DevTraitBadgeProps {
  trait: 'Normal' | 'Impact' | 'Star' | 'Elite';
}

const potentials = ['Elite', 'Star', 'Impact', 'Normal'];
const starOptions = ['5', '4', '3', '2', '1'];

interface RecruitingNeed {
  position: string;
  rating: string;
  need: number;
  signed: number;
  targeted: number;
}

const offensivePositions: RecruitingNeed[] = [
  { position: 'QB', rating: '', need: 0, signed: 0, targeted: 0 },
  { position: 'HB', rating: '', need: 0, signed: 0, targeted: 0 },
  { position: 'WR', rating: '', need: 0, signed: 0, targeted: 0 },
  { position: 'TE', rating: '', need: 0, signed: 0, targeted: 0 },
  { position: 'OT', rating: '', need: 0, signed: 0, targeted: 0 },
  { position: 'OG', rating: '', need: 0, signed: 0, targeted: 0 },
  { position: 'C', rating: '', need: 0, signed: 0, targeted: 0 },
];

const defensivePositions: RecruitingNeed[] = [
  { position: 'EDGE', rating: '', need: 0, signed: 0, targeted: 0 },
  { position: 'DT', rating: '', need: 0, signed: 0, targeted: 0 },
  { position: 'SAM/WILL', rating: '', need: 0, signed: 0, targeted: 0 },
  { position: 'MIKE', rating: '', need: 0, signed: 0, targeted: 0 },
  { position: 'CB', rating: '', need: 0, signed: 0, targeted: 0 },
  { position: 'FS/SS', rating: '', need: 0, signed: 0, targeted: 0 },
  { position: 'K/P', rating: '', need: 0, signed: 0, targeted: 0 },
];

const getRowStatus = (need: number, signed: number, targeted: number) => {
  if (signed >= need) return 'complete';
  if (signed + targeted >= need) return 'ontrack';
  return 'urgent';
};

const getTabIndex = (tableType: 'offensive' | 'defensive', positionIndex: number, fieldIndex: number) => {
  const baseIndex = tableType === 'offensive' ? 100 : 200;
  return baseIndex + (positionIndex * 10) + fieldIndex;
};

const RecruitingNeedsTable = React.memo<{ 
  title: string; 
  needs: RecruitingNeed[]; 
  updateNeed: (position: string, field: 'rating' | 'need' | 'signed' | 'targeted', value: string | number) => void;
  tableType: 'offensive' | 'defensive';
}>(({ title, needs, updateNeed, tableType }) => (
  <div className="w-full">
    <div className="bg-red-500 text-white text-center py-2 font-semibold">
      {title}
    </div>
    <div className="grid grid-cols-5 gap-0 border border-gray-300">
      <div className="bg-gray-100 dark:bg-gray-800 p-2 text-center font-medium border-r border-gray-300">Position</div>
      <div className="bg-gray-100 dark:bg-gray-800 p-2 text-center font-medium border-r border-gray-300">Rating</div>
      <div className="bg-gray-100 dark:bg-gray-800 p-2 text-center font-medium border-r border-gray-300">Need</div>
      <div className="bg-gray-100 dark:bg-gray-800 p-2 text-center font-medium border-r border-gray-300">Signed</div>
      <div className="bg-gray-100 dark:bg-gray-800 p-2 text-center font-medium">Targeted</div>
      
      {needs.map((need, positionIndex) => {
        const status = getRowStatus(need.need, need.signed, need.targeted);
        const rowClass = status === 'complete' ? 'bg-green-100 dark:bg-green-900' : '';
        
        return (
          <React.Fragment key={need.position}>
            <div className={`p-2 text-center border-r border-b border-gray-300 flex items-center justify-center ${rowClass}`}>
              {need.position}
              {status === 'complete' && <CheckCircle className="h-4 w-4 text-green-600 ml-2" />}
            </div>
            <div className={`p-2 border-r border-b border-gray-300 ${rowClass}`}>
              <Input
                key={`${need.position}-rating`}
                value={need.rating}
                onChange={(e) => updateNeed(need.position, 'rating', e.target.value)}
                className="w-full text-center border-0 bg-transparent p-1"
                placeholder="A, B+, etc."
                tabIndex={getTabIndex(tableType, positionIndex, 1)}
              />
            </div>
            <div className={`p-2 border-r border-b border-gray-300 ${rowClass} ${status === 'ontrack' ? 'bg-yellow-100 dark:bg-yellow-900' : ''}`}>
              <Input
                key={`${need.position}-need`}
                type="number"
                value={need.need || ''}
                onChange={(e) => updateNeed(need.position, 'need', parseInt(e.target.value) || 0)}
                className="w-full text-center border-0 bg-transparent p-1"
                min="0"
                tabIndex={getTabIndex(tableType, positionIndex, 2)}
              />
            </div>
            <div className={`p-2 border-r border-b border-gray-300 ${rowClass} ${status === 'urgent' ? 'bg-red-100 dark:bg-red-900' : ''}`}>
              <Input
                key={`${need.position}-signed`}
                type="number"
                value={need.signed || ''}
                onChange={(e) => updateNeed(need.position, 'signed', parseInt(e.target.value) || 0)}
                className="w-full text-center border-0 bg-transparent p-1"
                min="0"
                tabIndex={getTabIndex(tableType, positionIndex, 3)}
              />
            </div>
            <div className={`p-2 border-b border-gray-300 ${rowClass} ${status === 'urgent' ? 'bg-red-100 dark:bg-red-900' : ''}`}>
              <Input
                key={`${need.position}-targeted`}
                type="number"
                value={need.targeted || ''}
                onChange={(e) => updateNeed(need.position, 'targeted', parseInt(e.target.value) || 0)}
                className="w-full text-center border-0 bg-transparent p-1"
                min="0"
                tabIndex={getTabIndex(tableType, positionIndex, 4)}
              />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  </div>
));

RecruitingNeedsTable.displayName = 'RecruitingNeedsTable';

// NEW: Function to sort recruits by star rating (5 to 1)
const sortRecruitsByStars = (recruits: Recruit[]): Recruit[] => {
  return [...recruits].sort((a, b) => {
    // Convert star strings to numbers for comparison
    const starsA = parseInt(a.stars) || 0;
    const starsB = parseInt(b.stars) || 0;

    // Sort by stars descending (5 to 1)
    if (starsA !== starsB) {
      return starsB - starsA;
    }

    // If stars are equal, sort by rating descending as secondary sort
    const ratingA = parseInt(a.rating) || 0;
    const ratingB = parseInt(b.rating) || 0;
    return ratingB - ratingA;
  });
};

const RecruitingClassTracker: React.FC = () => {
  const { currentDynastyId } = useDynasty();
  const [currentYear] = useLocalStorage<number>('currentYear', new Date().getFullYear());
  const [allRecruits, setAllRecruits] = useLocalStorage<Recruit[]>('allRecruits', []);
  const [offensiveNeeds, setOffensiveNeeds] = useLocalStorage<RecruitingNeed[]>(
    currentDynastyId ? `offensiveNeeds_${currentDynastyId}` : 'offensiveNeeds', 
    offensivePositions
  );
  const [defensiveNeeds, setDefensiveNeeds] = useLocalStorage<RecruitingNeed[]>(
    currentDynastyId ? `defensiveNeeds_${currentDynastyId}` : 'defensiveNeeds', 
    defensivePositions
  );
  const [newRecruit, setNewRecruit] = useState<Omit<Recruit, 'id' | 'recruitedYear'>>({
    name: '',
    stars: '',
    position: '',
    rating: '',
    potential: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isNeedsExpanded, setIsNeedsExpanded] = useState<boolean>(false);

  // NEW: Apply star rating sorting to displayed recruits
  const recruitsForSelectedYear = sortRecruitsByStars(
    allRecruits.filter(recruit => recruit.recruitedYear === selectedYear)
  );

  const updateOffensiveNeed = useCallback((position: string, field: 'rating' | 'need' | 'signed' | 'targeted', value: string | number) => {
    setOffensiveNeeds(prev => prev.map(need => 
      need.position === position 
        ? { ...need, [field]: value }
        : need
    ));
  }, [setOffensiveNeeds]);

  const updateDefensiveNeed = useCallback((position: string, field: 'rating' | 'need' | 'signed' | 'targeted', value: string | number) => {
    setDefensiveNeeds(prev => prev.map(need => 
      need.position === position 
        ? { ...need, [field]: value }
        : need
    ));
  }, [setDefensiveNeeds]);

  const DevTraitBadge: React.FC<DevTraitBadgeProps> = ({ trait }) => {
    const colors = {
      'Elite': 'bg-red-400 text-purple-100 dark:bg-red-700 dark:text-purple-0',
      'Star': 'bg-yellow-500 text-yellow-900 dark:bg-yellow-500 dark:text-black',
      'Impact': 'bg-gray-400 text-gray-100 dark:bg-gray-600 dark:text-green-0',
      'Normal': 'bg-yellow-800 text-gray-100 dark:bg-yellow-900 dark:text-gray-0'
    } as const;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm/6 font-medium ${colors[trait]}`}>
        {trait}
      </span>
    );
  };

  const addRecruit = () => {
    const recruitToAdd = {
      ...newRecruit,
      id: Date.now(),
      recruitedYear: selectedYear,
      name: capitalizeName(newRecruit.name)
    };
    setAllRecruits([...allRecruits, recruitToAdd]);
    setNewRecruit({ name: '', stars: '', position: '', rating: '', potential: '' });
    notifySuccess(MESSAGES.SAVE_SUCCESS);
  };

  const startEditing = (recruit: Recruit) => {
    setEditingId(recruit.id);
    setNewRecruit(recruit);
  };

  const saveEdit = () => {
    setAllRecruits(allRecruits.map(recruit =>
      recruit.id === editingId
        ? { ...newRecruit, id: recruit.id, recruitedYear: selectedYear, name: capitalizeName(newRecruit.name) }
        : recruit
    ));
    setEditingId(null);
    setNewRecruit({ name: '', stars: '', position: '', rating: '', potential: '' });
    notifySuccess(MESSAGES.SAVE_SUCCESS);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewRecruit({ name: '', stars: '', position: '', rating: '', potential: '' });
  };

  const removeRecruit = (id: number) => {
    setAllRecruits(allRecruits.filter(recruit => recruit.id !== id));
    notifySuccess(MESSAGES.SAVE_SUCCESS);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-center">Recruiting Class Tracker</h1>

      <Card>
        <CardHeader 
          className="text-xl font-semibold text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setIsNeedsExpanded(!isNeedsExpanded)}
        >
          <div className="flex items-center justify-center gap-2">
            <span>Recruiting Needs Analysis</span>
            {isNeedsExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        {isNeedsExpanded && (
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecruitingNeedsTable 
                title="OFFENSIVE NEEDS" 
                needs={offensiveNeeds} 
                updateNeed={updateOffensiveNeed}
                tableType="offensive"
              />
              <RecruitingNeedsTable 
                title="DEFENSIVE NEEDS" 
                needs={defensiveNeeds} 
                updateNeed={updateDefensiveNeed}
                tableType="defensive"
              />
            </div>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 dark:bg-red-900 border"></div>
                <span>Red: Urgent - Need more recruits (Signed + Targeted &lt; Need)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900 border"></div>
                <span>Yellow: On Track - Have commitments to meet need (Signed + Targeted = Need)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Green Check: Complete - Need fully signed (Signed = Need)</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="text-xl font-semibold">
          <div className="flex justify-between items-center">
            <span>Add New Recruit for Year: {selectedYear}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <Input
              value={newRecruit.name}
              onChange={(e) => setNewRecruit({ ...newRecruit, name: e.target.value })}
              placeholder="Player Name"
            />
            <Select
              value={newRecruit.stars}
              onValueChange={(value) => setNewRecruit({ ...newRecruit, stars: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Stars" />
              </SelectTrigger>
              <SelectContent>
                {starOptions.map(stars => (
                  <SelectItem key={stars} value={stars}>{stars} ⭐</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={newRecruit.position}
              onValueChange={(value) => setNewRecruit({ ...newRecruit, position: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                {generalPositions.map(pos => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={newRecruit.rating}
              onChange={(e) => setNewRecruit({ ...newRecruit, rating: e.target.value })}
              placeholder="Rating"
            />
            <Select
              value={newRecruit.potential}
              onValueChange={(value) => setNewRecruit({ ...newRecruit, potential: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Dev. Trait" />
              </SelectTrigger>
              <SelectContent>
                {potentials.map(potential => (
                  <SelectItem key={potential} value={potential}>{potential}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editingId ? (
              <div className="flex gap-2">
                <Button onClick={saveEdit} size="sm">Save</Button>
                <Button onClick={cancelEdit} variant="outline" size="sm">Cancel</Button>
              </div>
            ) : (
              <Button onClick={addRecruit}>Add Recruit</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-xl font-semibold">
          <div className="flex justify-between items-center">
            <span>Recruiting Class for {selectedYear}</span>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Sorted by Star Rating (5★ → 1★)
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th className="text-center">Name</th>
                <th className="text-center">Stars</th>
                <th className="text-center">Position</th>
                <th className="text-center">Rating</th>
                <th className="text-center">Dev. Trait</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recruitsForSelectedYear.map(recruit => (
                <tr key={recruit.id}>
                  <td className="text-center">{recruit.name}</td>
                  <td className="text-center">{recruit.stars} ⭐</td>
                  <td className="text-center">{recruit.position}</td>
                  <td className="text-center">{recruit.rating}</td>
                  <td className="text-center"><DevTraitBadge trait={recruit.potential as 'Elite' | 'Star' | 'Impact' | 'Normal'} /></td>
                  <td className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Button variant="ghost" size="icon" onClick={() => startEditing(recruit)} title="Edit"> <Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" title="Remove Player"><Trash2 className="h-4 w-4 text-red-500" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Remove Player</AlertDialogTitle><AlertDialogDescription>Are you sure you want to remove {recruit.name}?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => removeRecruit(recruit.id)}>Remove</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecruitingClassTracker;